import { describe, expect, test } from 'vitest';
import uiReducer, { uiActions } from './index';
import { getExceededFile, getReachedFileSizeLimitDialogInfo } from 'testUtils/fixtures/drive.fixtures';

describe('File size limit reached dialog state', () => {
  test('When the dialog is opened without file info, then the dialog is marked as open and no file details are stored', () => {
    const action = uiActions.setOpenFileSizeLimitReachedDialog({ open: true });

    const state = uiReducer(undefined, action);

    expect(state.isReachedFileSizeLimitDialogOpen).toBe(true);
    expect(state.reachedFileSizeLimitDialogInfo).toBeUndefined();
  });

  test('When the dialog is opened with exceeded file details, then the dialog is marked as open and the file details are stored', () => {
    const info = getReachedFileSizeLimitDialogInfo({
      exceededFiles: [
        getExceededFile({ name: 'video.mp4', size: 5368709120 }),
        getExceededFile({ name: 'backup.zip', size: 2147483648 }),
      ],
    });
    const action = uiActions.setOpenFileSizeLimitReachedDialog({ open: true, info });

    const state = uiReducer(undefined, action);

    expect(state.isReachedFileSizeLimitDialogOpen).toBe(true);
    expect(state.reachedFileSizeLimitDialogInfo).toEqual(info);
  });

  test('When the dialog is closed, then the dialog is marked as closed and the file details are cleared', () => {
    const action = uiActions.setOpenFileSizeLimitReachedDialog({ open: false });

    const state = uiReducer(undefined, action);

    expect(state.isReachedFileSizeLimitDialogOpen).toBe(false);
    expect(state.reachedFileSizeLimitDialogInfo).toBeUndefined();
  });
});
