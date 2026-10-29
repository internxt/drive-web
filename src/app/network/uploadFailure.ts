import { ErrorMessages, HTTP_CODE_ERRORS, HTTP_STATUS_CODES } from 'app/core/constants';
import errorService from 'services/error.service';
import { ConnectionLostError } from './requests';
import { UploadFailureReason } from './types';

export interface UploadFailure {
  error: Error;
  reason: UploadFailureReason;
  isRetryable: boolean;
}

const getStatusCode = (error: unknown) => (error as { status?: number } | undefined)?.status;

const isNetworkErrorWhileOffline = (error: unknown) =>
  (error as Error | undefined)?.message === ErrorMessages.NetworkError && !navigator.onLine;

const isConnectionLost = (error: unknown) => error instanceof ConnectionLostError || isNetworkErrorWhileOffline(error);

const isStorageFull = (error: unknown) => getStatusCode(error) === HTTP_STATUS_CODES.MAX_SPACE_USED;

const isFileTooLarge = (error: unknown) =>
  errorService.castError(error).code === HTTP_CODE_ERRORS.FILE_UPLOAD_SIZE_EXCEEDED;

const isPlanNotAllowingIt = (error: unknown) => getStatusCode(error) === HTTP_STATUS_CODES.PAYMENT_REQUIRED;

const getFailureReason = (error: unknown): UploadFailureReason => {
  if (isConnectionLost(error)) return UploadFailureReason.ConnectionLost;
  if (isStorageFull(error)) return UploadFailureReason.NoSpaceLeft;
  if (isFileTooLarge(error)) return UploadFailureReason.FileTooLarge;
  return UploadFailureReason.UploadFailed;
};

export const toUploadFailure = (error: unknown): UploadFailure => {
  const reason = getFailureReason(error);
  const canSucceedLater = reason !== UploadFailureReason.FileTooLarge && !isPlanNotAllowingIt(error);
  const genericUploadError = new Error('Upload failed');

  return {
    error: errorService.castError(error ?? genericUploadError),
    reason,
    isRetryable: canSucceedLater,
  };
};

export const canSucceedOnImmediateRetry = (error: unknown): boolean =>
  getFailureReason(error) === UploadFailureReason.UploadFailed && !isPlanNotAllowingIt(error);
