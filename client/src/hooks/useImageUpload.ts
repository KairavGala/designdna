import { useCallback, useEffect, useRef, useState } from 'react';
import type { UploadedImage, UploadError, UploadStatus } from '../types/upload';
import { validateImageFile } from '../utils/imageValidation';

export interface UseImageUploadResult {
  status: UploadStatus;
  image: UploadedImage | null;
  error: UploadError | null;
  isPrepared: boolean;
  handleFiles: (files: FileList | File[] | null) => Promise<void>;
  setDragging: (dragging: boolean) => void;
  removeImage: () => void;
  dismissError: () => void;
  proceedToNextStage: () => void;
  returnToPreview: () => void;
}

export function useImageUpload(): UseImageUploadResult {
  const [status, setStatus] = useState<UploadStatus>('empty');
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [error, setError] = useState<UploadError | null>(null);
  const [isPrepared, setIsPrepared] = useState<boolean>(false);

  const activeUrlRef = useRef<string | null>(null);
  const validationSeqRef = useRef<number>(0);

  const revokeUrl = useCallback((url: string | null) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }, []);

  // Revoke any active object URL when the owning hook unmounts
  useEffect(() => {
    return () => {
      validationSeqRef.current += 1;
      revokeUrl(activeUrlRef.current);
      activeUrlRef.current = null;
    };
  }, [revokeUrl]);

  const setDragging = useCallback(
    (dragging: boolean) => {
      setStatus((prev) => {
        if (prev === 'validating') return prev;
        if (dragging) return 'dragging';
        if (error) return 'error';
        return activeUrlRef.current ? 'ready' : 'empty';
      });
    },
    [error]
  );

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files || files.length === 0) {
        // Cancelled file selection: restore previous non-dragging state cleanly
        setStatus((prev) => {
          if (prev !== 'dragging') return prev;
          return activeUrlRef.current ? 'ready' : error ? 'error' : 'empty';
        });
        return;
      }

      if (files.length > 1) {
        setError({
          code: 'MULTIPLE_FILES',
          title: 'Select one screenshot at a time',
          message: `You selected ${files.length} files. DesignDNA analyses one website screenshot at a time — please upload a single PNG, JPG, or WEBP file.`
        });
        setStatus('error');
        return;
      }

      const file = files[0];
      const currentSeq = ++validationSeqRef.current;

      setError(null);
      setStatus('validating');

      const result = await validateImageFile(file);

      // Ignore stale result if a newer selection or removal occurred
      if (currentSeq !== validationSeqRef.current) {
        if (result.ok) {
          revokeUrl(result.image.previewUrl);
        }
        return;
      }

      if (!result.ok) {
        // Retain any previously valid image when a replacement fails validation
        setError(result.error);
        setStatus('error');
        return;
      }

      // Replace previous object URL cleanly after successful validation
      revokeUrl(activeUrlRef.current);
      activeUrlRef.current = result.image.previewUrl;

      setImage(result.image);
      setError(null);
      setIsPrepared(false);
      setStatus('ready');
    },
    [error, revokeUrl]
  );

  const removeImage = useCallback(() => {
    // Invalidate any in-flight validation
    validationSeqRef.current += 1;
    revokeUrl(activeUrlRef.current);
    activeUrlRef.current = null;

    setImage(null);
    setError(null);
    setIsPrepared(false);
    setStatus('empty');
  }, [revokeUrl]);

  const dismissError = useCallback(() => {
    setError(null);
    setStatus(activeUrlRef.current ? 'ready' : 'empty');
  }, []);

  const proceedToNextStage = useCallback(() => {
    if (!activeUrlRef.current) return;
    setError(null);
    setStatus('ready');
    setIsPrepared(true);
  }, []);

  const returnToPreview = useCallback(() => {
    setIsPrepared(false);
  }, []);

  return {
    status,
    image,
    error,
    isPrepared,
    handleFiles,
    setDragging,
    removeImage,
    dismissError,
    proceedToNextStage,
    returnToPreview
  };
}
