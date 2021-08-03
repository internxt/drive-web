import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';
import { ILogger, ILoggerFile } from '../../../models/interfaces';

interface FilesState {
  fileHistory: ILogger,
}

const initialState: FilesState = {
  fileHistory: {}
};

const objectFilter = (obj: Record<any, any>, fn): Record<any, any> => Object.fromEntries(Object.entries(obj).filter(fn));

export const filesStateSlice = createSlice({
  name: 'filesState',
  initialState,
  reducers: {
    updateFileStatusLogger: (state, action: PayloadAction<ILoggerFile>) => {
      const { filePath, status, progress } = action.payload;

      if (state.fileHistory[filePath]) {
        if (status === 'success' || status === 'error' || status === 'pending') {
          const existingEntry = {
            [action.payload.filePath]: state.fileHistory[filePath]
          };
          const { [state.fileHistory[filePath].filePath]: filtered, ...rest } = state.fileHistory;

          state.fileHistory = rest;

          state.fileHistory = Object.assign(existingEntry, state.fileHistory);
          state.fileHistory[filePath].status = status;
        } else {
          state.fileHistory[filePath].status = status;
        }
      } else {
        const newEntry = {
          [action.payload.filePath]: action.payload
        };

        state.fileHistory = Object.assign(newEntry, state.fileHistory);
      }
      if (progress) {
        state.fileHistory[filePath].progress = progress;
      }
    },
    clearFileLoggerStatus: (state) => {
      state.fileHistory = {};
    }
  }
});

export const {
  updateFileStatusLogger,
  clearFileLoggerStatus
} = filesStateSlice.actions;

export const selectLoggerFiles = (state: RootState) => state.filesState.fileHistory;
export const selectFinishedFiles = (state: RootState) => {
  const entries = state.filesState.fileHistory;
  const finishedEntries = objectFilter(entries, ([key, value]) => value.status === 'error' || value.status === 'success');

  return finishedEntries;
};
export default filesStateSlice.reducer;