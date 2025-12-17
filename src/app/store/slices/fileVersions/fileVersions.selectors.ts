import { FileVersion, FileLimitsResponse } from '@internxt/sdk/dist/drive/storage/types';
import { RootState } from '../..';

const fileVersionsSelectors = {
  getLimits(state: RootState): FileLimitsResponse | null {
    return state.fileVersions.limits;
  },
  getVersionsByFileId(state: RootState, fileId: NonNullable<FileVersion['fileId']>): FileVersion[] | undefined {
    return state.fileVersions.versionsByFileId[fileId];
  },
  isLoadingByFileId(state: RootState, fileId: NonNullable<FileVersion['fileId']>): boolean {
    return state.fileVersions.isLoadingByFileId[fileId] ?? false;
  },
};

export default fileVersionsSelectors;
