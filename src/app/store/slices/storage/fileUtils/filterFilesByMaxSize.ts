import { MAX_ALLOWED_UPLOAD_SIZE } from 'app/drive/services/network.service';

interface FilterFilesByMaxSizePayload {
  files: File[];
  maxUploadFileSize?: number;
}

export const filterFilesByMaxSize = ({
  files,
  maxUploadFileSize = MAX_ALLOWED_UPLOAD_SIZE,
}: FilterFilesByMaxSizePayload): {
  allowedFilesToUpload: File[];
  exceededFiles: File[];
} => {
  const allowedFilesToUpload: File[] = [];
  const exceededFiles: File[] = [];

  for (const file of files) {
    if (file.size <= maxUploadFileSize) {
      allowedFilesToUpload.push(file);
    } else {
      exceededFiles.push(file);
    }
  }

  return { allowedFilesToUpload, exceededFiles };
};
