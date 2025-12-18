import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileVersion, FileLimitsResponse } from '@internxt/sdk/dist/drive/storage/types';
import fileVersionService from 'views/Drive/components/VersionHistory/services/fileVersion.service';
import { fileVersionsActions, fileVersionsReducer, fetchFileVersionsThunk, fetchVersionLimitsThunk } from './index';
import { RootState } from '../..';

vi.mock('views/Drive/components/VersionHistory/services/fileVersion.service', () => ({
  default: {
    getFileVersions: vi.fn(),
    getLimits: vi.fn(),
  },
}));

describe('fileVersions slice', () => {
  const fileUuid = 'file-uuid';
  const versions: FileVersion[] = [
    { id: 'v1', fileId: fileUuid } as FileVersion,
    { id: 'v2', fileId: fileUuid } as FileVersion,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('thunks', () => {
    it('fetch file versions succeeds', async () => {
      const getFileVersionsSpy = vi.spyOn(fileVersionService, 'getFileVersions').mockResolvedValueOnce(versions);
      const dispatch = vi.fn();

      const action = await fetchFileVersionsThunk(fileUuid)(dispatch, () => ({}) as RootState, undefined);

      expect(getFileVersionsSpy).toHaveBeenCalledWith(fileUuid);
      expect(action.meta.requestStatus).toBe('fulfilled');
      expect(action.payload).toEqual({ fileUuid, versions });
    });

    it('fetch file versions surfaces the error message', async () => {
      const getFileVersionsSpy = vi
        .spyOn(fileVersionService, 'getFileVersions')
        .mockRejectedValueOnce(new Error('failed to fetch'));
      const dispatch = vi.fn();

      const action = await fetchFileVersionsThunk(fileUuid)(dispatch, () => ({}) as RootState, undefined);

      expect(getFileVersionsSpy).toHaveBeenCalledWith(fileUuid);
      expect(action.meta.requestStatus).toBe('rejected');
      expect(action.payload).toBe('failed to fetch');
    });

    it('fetch version limits succeeds', async () => {
      const limits: FileLimitsResponse = {
        versioning: { enabled: true, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
      };
      const getLimitsSpy = vi.spyOn(fileVersionService, 'getLimits').mockResolvedValueOnce(limits);
      const dispatch = vi.fn();

      const action = await fetchVersionLimitsThunk()(dispatch, () => ({}) as RootState, undefined);

      expect(getLimitsSpy).toHaveBeenCalled();
      expect(action.meta.requestStatus).toBe('fulfilled');
      expect(action.payload).toBe(limits);
    });

    it('fetch version limits surfaces the error message', async () => {
      const getLimitsSpy = vi
        .spyOn(fileVersionService, 'getLimits')
        .mockRejectedValueOnce(new Error('limits unavailable'));
      const dispatch = vi.fn();

      const action = await fetchVersionLimitsThunk()(dispatch, () => ({}) as RootState, undefined);

      expect(getLimitsSpy).toHaveBeenCalled();
      expect(action.meta.requestStatus).toBe('rejected');
      expect(action.payload).toBe('limits unavailable');
    });
  });

  describe('reducers', () => {
    it('marks loading and error state while fetching versions', () => {
      const pendingState = fileVersionsReducer(undefined, fetchFileVersionsThunk.pending('', fileUuid));

      expect(pendingState.isLoadingByFileId[fileUuid]).toBe(true);
      expect(pendingState.errorsByFileId[fileUuid]).toBeNull();

      const rejectedState = fileVersionsReducer(pendingState, {
        type: fetchFileVersionsThunk.rejected.type,
        meta: { arg: fileUuid },
        payload: 'problem',
      } as any);

      expect(rejectedState.isLoadingByFileId[fileUuid]).toBe(false);
      expect(rejectedState.errorsByFileId[fileUuid]).toBe('problem');

      const fulfilledState = fileVersionsReducer(
        rejectedState,
        fetchFileVersionsThunk.fulfilled({ fileUuid, versions }, '', fileUuid),
      );

      expect(fulfilledState.isLoadingByFileId[fileUuid]).toBe(false);
      expect(fulfilledState.versionsByFileId[fileUuid]).toEqual(versions);
    });

    it('clears caches selectively and globally', () => {
      const populatedState = {
        versionsByFileId: { [fileUuid]: versions },
        isLoadingByFileId: { [fileUuid]: false },
        errorsByFileId: { [fileUuid]: 'error' },
        limits: null,
        isLimitsLoading: false,
      };

      const afterInvalidate = fileVersionsReducer(populatedState as any, fileVersionsActions.invalidateCache(fileUuid));
      expect(afterInvalidate.versionsByFileId[fileUuid]).toBeUndefined();
      expect(afterInvalidate.isLoadingByFileId[fileUuid]).toBeUndefined();
      expect(afterInvalidate.errorsByFileId[fileUuid]).toBeUndefined();

      const afterClearAll = fileVersionsReducer(populatedState as any, fileVersionsActions.clearAllCache());
      expect(afterClearAll.versionsByFileId).toEqual({});
      expect(afterClearAll.isLoadingByFileId).toEqual({});
      expect(afterClearAll.errorsByFileId).toEqual({});
    });

    it('removes deleted versions from the cached list', () => {
      const state = {
        versionsByFileId: { [fileUuid]: versions },
        isLoadingByFileId: {},
        errorsByFileId: {},
        limits: null,
        isLimitsLoading: false,
      };

      const updatedState = fileVersionsReducer(
        state as any,
        fileVersionsActions.updateVersionsAfterDelete({ fileUuid, versionId: 'v1' }),
      );

      expect(updatedState.versionsByFileId[fileUuid]).toEqual([versions[1]]);
    });

    it('tracks loading state for fetching limits', () => {
      const pendingState = fileVersionsReducer(undefined, fetchVersionLimitsThunk.pending('', undefined));
      expect(pendingState.isLimitsLoading).toBe(true);

      const limits: FileLimitsResponse = {
        versioning: { enabled: true, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
      };
      const fulfilledState = fileVersionsReducer(
        pendingState,
        fetchVersionLimitsThunk.fulfilled(limits, '', undefined),
      );
      expect(fulfilledState.isLimitsLoading).toBe(false);
      expect(fulfilledState.limits).toBe(limits);

      const rejectedState = fileVersionsReducer(
        pendingState,
        fetchVersionLimitsThunk.rejected(new Error('err'), '', undefined),
      );
      expect(rejectedState.isLimitsLoading).toBe(false);
    });
  });
});
