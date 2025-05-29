import { describe, it, expect } from 'vitest';
import {
  audioTypes,
  isFileSizePreviewable,
  isTypeSupportedByAudioPlayer,
  isTypeSupportedByVideoPlayer,
  videoTypes,
} from './media.service';

describe('videoTypes mapping', () => {
  it('should contain correct MIME for webm', () => {
    expect(videoTypes.webm).toBe('video/webm');
  });

  it('should contain correct MIME for mkv', () => {
    expect(videoTypes.mkv).toBe('video/x-matroska');
  });

  it('should not include unsupported extension', () => {
    expect((videoTypes as any).avi).toBeUndefined();
  });
});

describe('audioTypes mapping', () => {
  it('should contain correct MIME for mp3', () => {
    expect(audioTypes.mp3).toBe('audio/mpeg');
  });

  it('should contain correct MIME for flac', () => {
    expect(audioTypes.flac).toBe('audio/flac');
  });

  it('should not include unsupported extension', () => {
    expect((audioTypes as any).wma).toBeUndefined();
  });
});

describe('isTypeSupportedByVideoPlayer', () => {
  it('returns true for supported type', () => {
    expect(isTypeSupportedByVideoPlayer('mp4')).toBe(true);
  });

  it('returns false for unsupported type', () => {
    expect(isTypeSupportedByVideoPlayer('avi')).toBe(false);
  });
});

describe('isTypeSupportedByAudioPlayer', () => {
  it('returns true for supported type', () => {
    expect(isTypeSupportedByAudioPlayer('wav')).toBe(true);
  });

  it('returns false for unsupported type', () => {
    expect(isTypeSupportedByAudioPlayer('aiff')).toBe(false);
  });
});

describe('isFileSizePreviewable', () => {
  const limit = 512 * 1024 * 1024;

  it('returns true for size smaller than threshold', () => {
    expect(isFileSizePreviewable(limit - 1)).toBe(true);
  });

  it('returns false for size equal to threshold', () => {
    expect(isFileSizePreviewable(limit)).toBe(false);
  });

  it('returns false for size larger than threshold', () => {
    expect(isFileSizePreviewable(limit + 1)).toBe(false);
  });
});
