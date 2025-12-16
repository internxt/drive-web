import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { FileVersion, GetFileLimitsResponse } from '@internxt/sdk/dist/drive/storage/types';
import fileVersionService from 'views/Drive/components/VersionHistory/services/fileVersion.service';

interface FileVersionsState {
  versionsByFileId: Record<string, FileVersion[]>;
  loadingStates: Record<string, boolean>;
  errors: Record<string, string | null>;
  limits: GetFileLimitsResponse | null;
  limitsLoading: boolean;
}

const initialState: FileVersionsState = {
  versionsByFileId: {},
  loadingStates: {},
  errors: {},
  limits: null,
  limitsLoading: false,
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
      delete state.loadingStates[action.payload];
      delete state.errors[action.payload];
    },
    clearAllCache: (state) => {
      state.versionsByFileId = {};
      state.loadingStates = {};
      state.errors = {};
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
        state.loadingStates[action.meta.arg] = true;
        state.errors[action.meta.arg] = null;
      })
      .addCase(fetchFileVersionsThunk.fulfilled, (state, action) => {
        const { fileUuid, versions } = action.payload;
        state.versionsByFileId[fileUuid] = versions;
        state.loadingStates[fileUuid] = false;
      })
      .addCase(fetchFileVersionsThunk.rejected, (state, action) => {
        state.loadingStates[action.meta.arg] = false;
        state.errors[action.meta.arg] = action.payload as string;
      })
      .addCase(fetchVersionLimitsThunk.pending, (state) => {
        state.limitsLoading = true;
      })
      .addCase(fetchVersionLimitsThunk.fulfilled, (state, action) => {
        state.limits = action.payload;
        state.limitsLoading = false;
      })
      .addCase(fetchVersionLimitsThunk.rejected, (state) => {
        state.limitsLoading = false;
      });
  },
});

export const fileVersionsActions = fileVersionsSlice.actions;
export const fileVersionsReducer = fileVersionsSlice.reducer;
