import { describe, it, expect, test } from 'vitest';
import {
  audioTypes,
  isFileSizePreviewable,
  isTypeSupportedByAudioPlayer,
  isTypeSupportedByVideoPlayer,
  videoTypes,
  getVideoMimeType,
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

describe('Get video MIME type', () => {
  test('When given a supported video type, then it returns the correct MIME type', () => {
    expect(getVideoMimeType('mp4')).toBe('video/mp4');
    expect(getVideoMimeType('webm')).toBe('video/webm');
    expect(getVideoMimeType('mkv')).toBe('video/x-matroska');
    expect(getVideoMimeType('mov')).toBe('video/quicktime');
  });

  test('When given uppercase file type, then it returns the correct MIME type', () => {
    expect(getVideoMimeType('MP4')).toBe('video/mp4');
    expect(getVideoMimeType('WEBM')).toBe('video/webm');
    expect(getVideoMimeType('MKV')).toBe('video/x-matroska');
  });

  test('When given an unsupported file type, then it returns default video/mp4', () => {
    expect(getVideoMimeType('avi')).toBe('video/mp4');
    expect(getVideoMimeType('wmv')).toBe('video/mp4');
    expect(getVideoMimeType('unknown')).toBe('video/mp4');
  });

  test('When given an empty string, then it returns default the mp4 mime type', () => {
    expect(getVideoMimeType('')).toBe('video/mp4');
  });
});
