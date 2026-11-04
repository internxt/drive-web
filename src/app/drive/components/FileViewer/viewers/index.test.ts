import { describe, expect, test } from 'vitest';
import { getFileViewer } from '.';
import { ViewerContentSource } from './types';

describe('Choosing how a file is previewed', () => {
  test.each([
    { type: 'pdf', contentSource: ViewerContentSource.Blob },
    { type: 'JPG', contentSource: ViewerContentSource.Blob },
    { type: 'docx', contentSource: ViewerContentSource.Blob },
    { type: 'xlsx', contentSource: ViewerContentSource.Blob },
    { type: 'csv', contentSource: ViewerContentSource.Blob },
    { type: 'mp3', contentSource: ViewerContentSource.Blob },
    { type: 'mp4', contentSource: ViewerContentSource.Stream },
  ])('When the file is a $type, then it is previewed from its $contentSource', ({ type, contentSource }) => {
    expect(getFileViewer({ type })?.contentSource).toBe(contentSource);
  });

  test.each(['zip', 'pptx', 'unknown', ''])('When the file is a "%s", then there is no preview for it', (type) => {
    expect(getFileViewer({ type })).toBeUndefined();
  });
});
