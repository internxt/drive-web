import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '..';
import { FileActionTypes, FileStatusTypes } from '../../models/enums';
import { ILogger, ILoggerFile } from '../../models/interfaces';
import { IActionUpdateFileLoggerEntry } from '../../models/reduxActions';

interface FilesState {
  fileHistory: ILogger,
  processingItems: ILogger,
  pendingItems: ILogger
}

const initialState: FilesState = {
  fileHistory: {},
  processingItems: {},
  pendingItems: {}
};

export const objectFilter = (obj: Record<any, any>, fn): Record<any, any> => Object.fromEntries(Object.entries(obj).filter(fn));

export const filesStateSlice = createSlice({
  name: 'filesState',
  initialState,
  reducers: {
    addFileToHistory: (state, action: PayloadAction<ILoggerFile>) => {
      const newEntry = {
        [action.payload.filePath]: action.payload
      };
      const newState = Object.assign(newEntry, state.pendingItems);

      state.pendingItems = newState;
      state.fileHistory = { ...state.processingItems, ...state.pendingItems };
    },
    updateFileStatus: (state, action: PayloadAction<IActionUpdateFileLoggerEntry>) => {
      const { filePath, status, progress, errorMessage } = action.payload;
      const fileAction = action.payload.action;

      if (status) {
        if (state.fileHistory[filePath]) {
          if (status === FileStatusTypes.Uploading || status === FileStatusTypes.Downloading) {

            if (state.processingItems[filePath]) {
              state.fileHistory[filePath].progress = progress;
              return;
            }
            const processingItem = {
              [action.payload.filePath]: state.pendingItems[filePath]
            };

            state.pendingItems = objectFilter(state.pendingItems, ([_, item]) => item.filepath !== filePath);
            state.processingItems = Object.assign(processingItem, state.processingItems);
            state.fileHistory = { ...state.processingItems, ...state.pendingItems };
            state.fileHistory[filePath].status = status;

            if (errorMessage) {
              state.fileHistory[filePath].errorMessage = errorMessage;
            }
          } else {
            const finishedItem = {
              [action.payload.filePath]: state.processingItems[filePath]
            };

            const newProcessingItems = objectFilter(state.processingItems, ([_, item]) => item.filepath !== filePath);
            const newPendingItems = Object.assign(finishedItem, state.pendingItems);

            state.pendingItems = newPendingItems;
            state.processingItems = newProcessingItems;
            state.fileHistory = { ...state.processingItems, ...state.pendingItems };
            state.fileHistory[filePath].status = status;

          }
        } else {
          const newEntry = {
            [action.payload.filePath]: action.payload
          };

          state.pendingItems = Object.assign(newEntry, state.pendingItems);
          state.fileHistory = { ...state.processingItems, ...state.pendingItems };
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