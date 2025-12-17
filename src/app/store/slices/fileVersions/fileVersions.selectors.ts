import { FileVersion, FileLimitsResponse } from '@internxt/sdk/dist/drive/storage/types';
import { RootState } from '../..';

const fileVersionsSelectors = {
  getLimits(state: RootState): FileLimitsResponse | null {
    return state.fileVersions.limits;
  },
  isLimitsLoading(state: RootState): boolean {
    return state.fileVersions.isLimitsLoading;
  },
  getVersionsByFileId(state: RootState, fileId: NonNullable<FileVersion['fileId']>): FileVersion[] | undefined {
    return state.fileVersions.versionsByFileId[fileId];
  },
  isLoadingByFileId(state: RootState, fileId: NonNullable<FileVersion['fileId']>): boolean {
    return state.fileVersions.isLoadingByFileId[fileId] ?? false;
  },
  getErrorByFileId(state: RootState, fileId: NonNullable<FileVersion['fileId']>): string | null | undefined {
    return state.fileVersions.errorsByFileId[fileId];
  },
};

export default fileVersionsSelectors;
