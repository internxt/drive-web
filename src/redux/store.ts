import { configureStore } from '@reduxjs/toolkit';
import networkReducer from './slices/networkSlice';

export const store = configureStore({
  reducer: {
    network: networkReducer
  }
});

/* function logger({ getState }) {
  return next => action => {
    console.log()
  }
}
 */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;