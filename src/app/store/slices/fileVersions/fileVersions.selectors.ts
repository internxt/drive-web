import { FileVersion, FileLimitsResponse } from '@internxt/sdk/dist/drive/storage/types';
import { RootState } from '../..';
import { MAX_ALLOWED_UPLOAD_SIZE } from 'app/drive/services/network.service';

const fileVersionsSelectors = {
  getLimits(state: RootState): FileLimitsResponse | null {
    return state.fileVersions.limits;
  },
  getMaxFileSizeLimit(state: RootState): number {
    return state.fileVersions.limits?.maxUploadFileSize ?? MAX_ALLOWED_UPLOAD_SIZE;
  },
  isLimitsLoading(state: RootState): boolean {
    return state.fileVersions.isLimitsLoading;
  },
  getVersionsByFileId(state: RootState, fileId: NonNullable<FileVersion['fileId']>): FileVersion[] {
    return state.fileVersions.versionsByFileId[fileId] ?? [];
  },
  isLoadingByFileId(state: RootState, fileId: NonNullable<FileVersion['fileId']>): boolean {
    return state.fileVersions.isLoadingByFileId[fileId] ?? false;
  },
};

export default fileVersionsSelectors;
