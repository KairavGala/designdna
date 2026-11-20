export type SupportedImageFormat = 'PNG' | 'JPG' | 'WEBP';

export type UploadStatus = 'empty' | 'dragging' | 'validating' | 'ready' | 'error';

export type UploadErrorCode =
  | 'MULTIPLE_FILES'
  | 'UNSUPPORTED_FORMAT'
  | 'FILE_TOO_LARGE'
  | 'EMPTY_FILE'
  | 'SIGNATURE_MISMATCH'
  | 'DECODE_FAILED'
  | 'UNEXPECTED_ERROR';

export interface UploadError {
  code: UploadErrorCode;
  title: string;
  message: string;
  fileName?: string;
}

export interface UploadedImage {
  file: File;
  previewUrl: string;
  name: string;
  format: SupportedImageFormat;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const SUPPORTED_FORMATS: readonly SupportedImageFormat[] = ['PNG', 'JPG', 'WEBP'];

export const ACCEPTED_EXTENSIONS: readonly string[] = ['.png', '.jpg', '.jpeg', '.webp'];

export const ACCEPTED_MIME_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/webp'
];

export const FILE_INPUT_ACCEPT = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';
