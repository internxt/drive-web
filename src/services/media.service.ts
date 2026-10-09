import { VideoExtensions, AudioExtensions } from 'app/drive/types/file-types';
import envService from './env.service';

type VideoTypes = Record<keyof VideoExtensions, string>;
type AudioTypes = Record<keyof AudioExtensions, string>;

export const videoTypes: Partial<VideoTypes> = {
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  qt: 'video/quicktime',
  mp4: 'video/mp4',
  mpg4: 'video/mp4',
  m4v: 'video/mp4',
  '3gp': 'video/3gpp',
};

export const audioTypes: Partial<AudioTypes> = {
  aac: 'audio/aac',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  oga: 'audio/ogg',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  wav: 'audio/wav',
  weba: 'audio/webm',
};

const DEFAULT_MAX_PREVIEWABLE_FILE_SIZE_IN_MB = 512 * 1024 * 1024;

function getMaxPreviewableFileSizeInBytes(): number {
  const sizeInMb = Number(envService.getVariable('maxPreviewableFileSize'));
  const isValidSize = Number.isFinite(sizeInMb) && sizeInMb > 0;
  return isValidSize ? sizeInMb : DEFAULT_MAX_PREVIEWABLE_FILE_SIZE_IN_MB;
}

export function isFileSizePreviewable(size: number): boolean {
  return size > 0 && size <  getMaxPreviewableFileSizeInBytes();
}

export function getVideoMimeType(fileType: string): string {
  const extension = fileType.toLowerCase() as keyof VideoExtensions;
  return videoTypes[extension] || 'video/mp4';
}
