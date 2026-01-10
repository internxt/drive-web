import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { FileVersion, FileLimitsResponse } from '@internxt/sdk/dist/drive/storage/types';
import fileVersionService from 'views/Drive/services/fileVersion.service';

interface FileVersionsState {
  versionsByFileId: Record<NonNullable<FileVersion['fileId']>, FileVersion[]>;
  isLoadingByFileId: Record<NonNullable<FileVersion['fileId']>, boolean>;
  errorsByFileId: Record<NonNullable<FileVersion['fileId']>, string | null>;
  limits: FileLimitsResponse | null;
  isLimitsLoading: boolean;
}

const initialState: FileVersionsState = {
  versionsByFileId: {},
  isLoadingByFileId: {},
  errorsByFileId: {},
  limits: null,
  isLimitsLoading: false,
};

export const fetchFileVersionsThunk = createAsyncThunk(
  'fileVersions/fetch',
  async (fileUuid: string, { rejectWithValue }) => {
    try {
      const versions = await fileVersionService.getFileVersions(fileUuid);
      return { fileUuid, versions };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  },
);

export const fetchVersionLimitsThunk = createAsyncThunk('fileVersions/fetchLimits', async (_, { rejectWithValue }) => {
  try {
    const limits = await fileVersionService.getLimits();
    return limits;
  } catch (error) {
    return rejectWithValue((error as Error).message);
  }
});

export const fileVersionsSlice = createSlice({
  name: 'fileVersions',
  initialState,
  reducers: {
    invalidateCache: (state, action: PayloadAction<string>) => {
      delete state.versionsByFileId[action.payload];
      delete state.isLoadingByFileId[action.payload];
      delete state.errorsByFileId[action.payload];
    },
    clearAllCache: (state) => {
      state.versionsByFileId = {};
      state.isLoadingByFileId = {};
      state.errorsByFileId = {};
    },
    updateVersionsAfterDelete: (state, action: PayloadAction<{ fileUuid: string; versionId: string }>) => {
      const { fileUuid, versionId } = action.payload;
      if (state.versionsByFileId[fileUuid]) {
        state.versionsByFileId[fileUuid] = state.versionsByFileId[fileUuid].filter((v) => v.id !== versionId);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFileVersionsThunk.pending, (state, action) => {
        state.isLoadingByFileId[action.meta.arg] = true;
        state.errorsByFileId[action.meta.arg] = null;
      })
      .addCase(fetchFileVersionsThunk.fulfilled, (state, action) => {
        const { fileUuid, versions } = action.payload;
        state.versionsByFileId[fileUuid] = versions;
        state.isLoadingByFileId[fileUuid] = false;
      })
      .addCase(fetchFileVersionsThunk.rejected, (state, action) => {
        state.isLoadingByFileId[action.meta.arg] = false;
        state.errorsByFileId[action.meta.arg] = action.payload as string;
      })
      .addCase(fetchVersionLimitsThunk.pending, (state) => {
        state.isLimitsLoading = true;
      })
      .addCase(fetchVersionLimitsThunk.fulfilled, (state, action) => {
        state.limits = action.payload;
        state.isLimitsLoading = false;
      })
      .addCase(fetchVersionLimitsThunk.rejected, (state) => {
        state.isLimitsLoading = false;
      });
  },
});

export const fileVersionsActions = fileVersionsSlice.actions;
export const fileVersionsReducer = fileVersionsSlice.reducer;
export { default as fileVersionsSelectors } from './fileVersions.selectors';
