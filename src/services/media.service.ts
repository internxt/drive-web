import { VideoExtensions, AudioExtensions } from 'app/drive/types/file-types';

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

export function isTypeSupportedByVideoPlayer(type: keyof VideoExtensions): boolean {
  return Object.keys(videoTypes).includes(type);
}

export function isTypeSupportedByAudioPlayer(type: keyof AudioExtensions): boolean {
  return Object.keys(audioTypes).includes(type);
}

const HALF_A_GIGABYTE_IN_BYTES = 512 * 1024 * 1024;
export function isFileSizePreviewable(size: number): boolean {
  return size < HALF_A_GIGABYTE_IN_BYTES;
}
