import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
// // import sharedService, { getAllSharedLinksResponse } from 'app/shareLinks/services/shared.service';
// import { RootState } from '../..';

// import { ShareLink } from '../../../shareLinks/types';

// interface ShareLinksState {
//   isLoadingShareds: boolean;
//   sharedLinks: ShareLink[];
//   pagination: {
//     page: number;
//     perPage: number;
//     totalItems: number;
//   };
// }

// const initialState: ShareLinksState = {
//   isLoadingShareds: false,
//   sharedLinks: [],
//   pagination: {
//     page: 1,
//     perPage: 50,
//     totalItems: 0,
//   },
// };

// export const fetchSharedLinksThunk = createAsyncThunk<getAllSharedLinksResponse, void, { state: RootState }>(
//   'shareds/fetchSharedLinks',
//   async (_, { getState }) => {
//     const state = getState();
//     const page = state.shared.pagination.page;
//     const perPage = state.shared.pagination.perPage;
//     return sharedService.getAllSharedLinks(page, perPage);
//   },
// );

// export const sharedSlice = createSlice({
//   name: 'shared',
//   initialState,
//   reducers: {},
//   extraReducers: (builder) => {
//     builder
//       .addCase(fetchSharedLinksThunk.pending, (state) => {
//         state.isLoadingShareds = true;
//       })
//       .addCase(fetchSharedLinksThunk.fulfilled, (state, action) => {
//         state.isLoadingShareds = false;
//         state.sharedLinks = action.payload.sharedLinks;
//         state.pagination = action.payload.pagination;
//       })
//       .addCase(fetchSharedLinksThunk.rejected, (state) => {
//         state.isLoadingShareds = false;
//       });
//   },
// });

// export const sharedSelectors = {};

// export const sharedActions = sharedSlice.actions;

// export const sharedThunks = {
//   fetchSharedLinksThunk,
// };

// export default sharedSlice.reducer;
