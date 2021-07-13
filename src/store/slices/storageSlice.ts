import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FileState {
  isLoading: boolean;
  items: any[],
  selectedItems: number[]
}

const initialState: FileState = {
  isLoading: false,
  items: [],
  selectedItems: []
};

export const storageSlice = createSlice({
  name: 'storage',
  initialState,
  reducers: {
    setIsLoading: (state: FileState, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setItems: (state: FileState, action: PayloadAction<any[]>) => {
      state.items = action.payload;
    },
    selectItem: (state: FileState, action: PayloadAction<number>) => {
      state.selectedItems.push(action.payload);
    },
    resetSelectedItems: (state: FileState) => {
      state.selectedItems = [];
    }
  }
});

export const {
  setIsLoading,
  setItems,
  selectItem,
  resetSelectedItems
} = storageSlice.actions;

export default storageSlice.reducer;