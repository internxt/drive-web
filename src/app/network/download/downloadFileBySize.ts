import { downloadFile, IDownloadParams, multipartDownloadFile } from 'app/network/download';
import { MIN_DOWNLOAD_MULTIPART_SIZE } from 'app/network/networkConstants';

export const shouldUseMultipartDownload = (fileSize: number): boolean => fileSize >= MIN_DOWNLOAD_MULTIPART_SIZE;

export const downloadFileBySize = ({
  fileSize,
  ...params
}: IDownloadParams & { fileSize: number }): Promise<ReadableStream<Uint8Array>> =>
  shouldUseMultipartDownload(fileSize) ? multipartDownloadFile({ ...params, fileSize }) : downloadFile(params);
