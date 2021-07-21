import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';
import { ILogger, ILoggerFile } from '../../../models/interfaces';
import { IActionUpdateFileLoggerEntry } from '../../../models/reduxActions';

interface FilesState {
  fileHistory: ILogger
}

const initialState: FilesState = {
  fileHistory: {}
};

export const filesStateSlice = createSlice({
  name: 'filesState',
  initialState,
  reducers: {
    addFileToHistory: (state, action: PayloadAction<ILoggerFile>) => {
      const newEntry = {
        [action.payload.filePath]: action.payload
      };
      const newState = Object.assign(newEntry, state.fileHistory);

      state.fileHistory= newState;
    },
    updateFileStatus: (state, action: PayloadAction<IActionUpdateFileLoggerEntry>) => {
      const { filePath, status, progress, errorMessage } = action.payload;
      const fileAction = action.payload.action;

      if (state.fileHistory[filePath]) {
        if (status) {
          state.fileHistory[filePath].status = status;
          if (errorMessage) {
            state.fileHistory[filePath].errorMessage = errorMessage;
          }
        }
        if (fileAction) {
          state.fileHistory[filePath].action = fileAction;
        }
        if (progress) {
          state.fileHistory[filePath].progress = progress;
        }
      }
    }
  }
});

export const {
  addFileToHistory,
  updateFileStatus
} = filesStateSlice.actions;
export const selectLoggerFiles = (state: RootState) => state.filesState.fileHistory;
export default filesStateSlice.reducer;