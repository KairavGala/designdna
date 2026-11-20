import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  type SupportedImageFormat,
  type UploadedImage,
  type UploadError
} from '../types/upload';

export type ValidationResult =
  | { ok: true; image: UploadedImage }
  | { ok: false; error: UploadError };

const EXTENSION_TO_FORMAT: Record<string, SupportedImageFormat> = {
  '.png': 'PNG',
  '.jpg': 'JPG',
  '.jpeg': 'JPG',
  '.webp': 'WEBP'
};

const MIME_TO_FORMAT: Record<string, SupportedImageFormat> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WEBP'
};

const FORMAT_TO_CANONICAL_MIME: Record<SupportedImageFormat, string> = {
  PNG: 'image/png',
  JPG: 'image/jpeg',
  WEBP: 'image/webp'
};

function getLowercaseExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return '';
  }
  return fileName.slice(lastDotIndex).toLowerCase();
}

function detectFormatFromMagicBytes(bytes: Uint8Array): SupportedImageFormat | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'PNG';
  }

  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'JPG';
  }

  // WEBP: "RIFF" (0..3) + "WEBP" (8..11)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'WEBP';
  }

  return null;
}

async function readFileHeaderBytes(file: File): Promise<Uint8Array> {
  const headerSlice = file.slice(0, 12);
  const buffer = await headerSlice.arrayBuffer();
  return new Uint8Array(buffer);
}

function decodeImageDimensions(
  previewUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = async () => {
      try {
        if (typeof img.decode === 'function') {
          await img.decode();
        }
        if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
          reject(new Error('Image has invalid intrinsic dimensions.'));
          return;
        }
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Image decode failed.'));
      }
    };

    img.onerror = () => {
      reject(new Error('Browser failed to load image payload.'));
    };

    img.src = previewUrl;
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function formatAspectRatio(width: number, height: number): string {
  if (width <= 0 || height <= 0) return '—';

  const divisor = gcd(width, height);
  const reducedW = width / divisor;
  const reducedH = height / divisor;
  const decimal = (width / height).toFixed(2);

  if (reducedW <= 32 && reducedH <= 32) {
    return `${reducedW}:${reducedH} (${decimal})`;
  }
  return `${decimal}:1`;
}

export function getImageOrientation(width: number, height: number): 'Landscape' | 'Portrait' | 'Square' {
  if (width === height) return 'Square';
  return width > height ? 'Landscape' : 'Portrait';
}

export async function validateImageFile(file: File): Promise<ValidationResult> {
  try {
    // 1. Empty file check
    if (file.size === 0) {
      return {
        ok: false,
        error: {
          code: 'EMPTY_FILE',
          title: 'Empty file',
          message: 'This file is 0 bytes and does not contain image data.',
          fileName: file.name
        }
      };
    }

    // 2. File size check
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const mbCeil = Math.ceil((file.size / (1024 * 1024)) * 100) / 100;
      const reportedSize = `${mbCeil.toFixed(2)} MB`;
      return {
        ok: false,
        error: {
          code: 'FILE_TOO_LARGE',
          title: 'File exceeds size limit',
          message: `This file is ${reportedSize}. Please choose a screenshot up to ${MAX_FILE_SIZE_MB} MB.`,
          fileName: file.name
        }
      };
    }

    // 3. File extension check
    const extension = getLowercaseExtension(file.name);
    if (!extension || !ACCEPTED_EXTENSIONS.includes(extension)) {
      return {
        ok: false,
        error: {
          code: 'UNSUPPORTED_FORMAT',
          title: 'Unsupported file format',
          message: `${extension ? `Files with the ${extension.toUpperCase()} extension` : 'Files without a recognised image extension'} are not supported. Upload a PNG, JPG, or WEBP screenshot.`,
          fileName: file.name
        }
      };
    }

    const expectedFormat = EXTENSION_TO_FORMAT[extension];

    // 4. MIME type check (when provided by the browser)
    const normalizedMime = file.type.trim().toLowerCase();
    if (normalizedMime !== '') {
      if (!ACCEPTED_MIME_TYPES.includes(normalizedMime)) {
        return {
          ok: false,
          error: {
            code: 'UNSUPPORTED_FORMAT',
            title: 'Unsupported MIME type',
            message: `Received unsupported media type (${normalizedMime}). Only PNG, JPG, and WEBP screenshots are accepted.`,
            fileName: file.name
          }
        };
      }

      const mimeFormat = MIME_TO_FORMAT[normalizedMime];
      if (mimeFormat && mimeFormat !== expectedFormat) {
        return {
          ok: false,
          error: {
            code: 'SIGNATURE_MISMATCH',
            title: 'File extension does not match file type',
            message: `This file uses the ${extension} extension, but reports media type ${normalizedMime}. Please upload a valid PNG, JPG, or WEBP image.`,
            fileName: file.name
          }
        };
      }
    }

    // 5. Binary magic-byte inspection (never trust extension or MIME alone)
    const headerBytes = await readFileHeaderBytes(file);
    const detectedFormat = detectFormatFromMagicBytes(headerBytes);

    if (!detectedFormat) {
      return {
        ok: false,
        error: {
          code: 'SIGNATURE_MISMATCH',
          title: 'Invalid or corrupted image file',
          message:
            'The file contents do not match a valid PNG, JPG, or WEBP image signature. Ensure the file was not renamed or corrupted.',
          fileName: file.name
        }
      };
    }

    if (detectedFormat !== expectedFormat) {
      return {
        ok: false,
        error: {
          code: 'SIGNATURE_MISMATCH',
          title: 'Misleading file extension',
          message: `This file has a ${extension} extension, but its binary contents are ${detectedFormat}. Please provide a screenshot whose extension matches its actual format.`,
          fileName: file.name
        }
      };
    }

    // 6. Browser decode verification & intrinsic dimensions
    const previewUrl = URL.createObjectURL(file);
    try {
      const { width, height } = await decodeImageDimensions(previewUrl);
      return {
        ok: true,
        image: {
          file,
          previewUrl,
          name: file.name,
          format: detectedFormat,
          mimeType: normalizedMime || FORMAT_TO_CANONICAL_MIME[detectedFormat],
          size: file.size,
          width,
          height,
          aspectRatio: width / height
        }
      };
    } catch {
      URL.revokeObjectURL(previewUrl);
      return {
        ok: false,
        error: {
          code: 'DECODE_FAILED',
          title: 'Unable to decode screenshot',
          message:
            'The browser could not decode this image. The file appears corrupted or incomplete — try exporting the screenshot again.',
          fileName: file.name
        }
      };
    }
  } catch {
    return {
      ok: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        title: 'Unexpected upload error',
        message: 'Something went wrong while reading the selected file. Please try again.',
        fileName: file.name
      }
    };
  }
}
