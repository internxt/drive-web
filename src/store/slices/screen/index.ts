import { createSlice } from '@reduxjs/toolkit';
import tailwindDefaultTheme from 'tailwindcss/defaultTheme';
import { RootState } from '../..';

interface ScreenState {
  innerWidth: number;
  innerHeight: number;
}

const initialState: ScreenState = {
  innerWidth: 0,
  innerHeight: 0,
};

export const screenSlice = createSlice({
  name: 'screen',
  initialState,
  reducers: {
    initialize: (state: ScreenState) => {
      state.innerWidth = window.innerWidth;
      state.innerHeight = window.innerHeight;
    },
    updateInnerSize: (state) => {
      state.innerWidth = window.innerWidth;
      state.innerHeight = window.innerHeight;
    },
  },
});

export const screenSelectors = {
  isLg: (state: RootState): boolean => {
    const lgPixelsWidth = tailwindDefaultTheme.screens.lg;
    const lgWidth = parseInt(lgPixelsWidth.substring(0, lgPixelsWidth.length - 2));

    return state.screen.innerWidth > lgWidth;
  },
};

export const screenActions = screenSlice.actions;

export default screenSlice.reducer;
