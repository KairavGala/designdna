export interface DecodedImageSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

function decodeViaImageElement(file: File): Promise<DecodedImageSource> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    const cleanupUrl = () => {
      URL.revokeObjectURL(objectUrl);
    };

    img.onload = async () => {
      try {
        if (typeof img.decode === 'function') {
          await img.decode();
        }
        if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
          cleanupUrl();
          reject(new Error('Decoded image has invalid dimensions.'));
          return;
        }
        resolve({
          source: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
          release: cleanupUrl
        });
      } catch (err) {
        cleanupUrl();
        reject(err instanceof Error ? err : new Error('Failed to decode image element.'));
      }
    };

    img.onerror = () => {
      cleanupUrl();
      reject(new Error('Browser could not load the image for processing.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Decodes a validated image File into a Canvas-drawable bitmap using
 * createImageBitmap() when available, falling back cleanly to HTMLImageElement.
 * Always call `release()` after drawing to free browser bitmap memory.
 */
export async function decodeImage(file: File): Promise<DecodedImageSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      if (bitmap.width <= 0 || bitmap.height <= 0) {
        bitmap.close();
        throw new Error('Decoded bitmap has invalid dimensions.');
      }
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => {
          bitmap.close();
        }
      };
    } catch {
      // Fall back to HTMLImageElement if createImageBitmap fails for this format
    }
  }

  return decodeViaImageElement(file);
}
