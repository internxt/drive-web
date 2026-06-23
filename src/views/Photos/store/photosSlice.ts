import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from 'app/store';
import photosService, { PhotoDevice } from '../services/photos.service';

interface PhotosState {
  isLoadingDevices: boolean;
  devices: PhotoDevice[];
  currentDevice: PhotoDevice | null;
}

const initialState: PhotosState = {
  isLoadingDevices: false,
  devices: [],
  currentDevice: null,
};

export const fetchPhotoDevicesThunk = createAsyncThunk<PhotoDevice[], void, { state: RootState }>(
  'photos/fetchDevices',
  async () => photosService.listDevices(),
);

export const deletePhotoDeviceThunk = createAsyncThunk<string, PhotoDevice, { state: RootState }>(
  'photos/deleteDevice',
  async (device) => {
    await photosService.deleteDevice(device.uuid);
    return device.uuid;
  },
);

export const photosSlice = createSlice({
  name: 'photos',
  initialState,
  reducers: {
    setCurrentDevice: (state, action: PayloadAction<PhotoDevice | null>) => {
      state.currentDevice = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPhotoDevicesThunk.pending, (state) => {
        state.isLoadingDevices = true;
      })
      .addCase(fetchPhotoDevicesThunk.fulfilled, (state, action) => {
        state.isLoadingDevices = false;
        state.devices = action.payload;
      })
      .addCase(fetchPhotoDevicesThunk.rejected, (state) => {
        state.isLoadingDevices = false;
      })
      .addCase(deletePhotoDeviceThunk.fulfilled, (state, action) => {
        state.devices = state.devices.filter((d) => d.uuid !== action.payload);
      });
  },
});

export const { setCurrentDevice } = photosSlice.actions;
export default photosSlice.reducer;
