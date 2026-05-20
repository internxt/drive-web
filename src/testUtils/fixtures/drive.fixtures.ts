import { ExceededFile, ReachedFileSizeLimitDialogInfo } from 'app/drive/types';

export const getExceededFile = (overrides: Partial<ExceededFile> = {}): ExceededFile => ({
  name: 'large-document.pdf',
  size: 1073741824,
  ...overrides,
});

export const getReachedFileSizeLimitDialogInfo = (
  overrides: Partial<ReachedFileSizeLimitDialogInfo> = {},
): ReachedFileSizeLimitDialogInfo => ({
  exceededFiles: [getExceededFile()],
  ...overrides,
});
