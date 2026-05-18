interface FilterFilesByMaxSizePayload {
  files: File[];
  maxUploadFileSize?: number;
}

export const filterFilesByMaxSize = ({
  files,
  maxUploadFileSize,
}: FilterFilesByMaxSizePayload): {
  allowedFilesToUpload: File[];
  exceededFiles: File[];
} => {
  if (!maxUploadFileSize)
    return {
      allowedFilesToUpload: files,
      exceededFiles: [],
    };

  const allowedFilesToUpload = files.filter((file) => file.size <= maxUploadFileSize);
  const exceededFiles = files.filter((file) => file.size > maxUploadFileSize);

  return {
    allowedFilesToUpload,
    exceededFiles,
  };
};
