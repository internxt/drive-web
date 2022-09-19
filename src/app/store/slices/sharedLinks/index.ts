import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import shareService from 'app/share/services/share.service';
import { RootState } from '../..';

import { ListShareLinksItem, ListShareLinksResponse } from '@internxt/sdk/dist/drive/share/types';//import { ShareLink } from '../../../shareLinks/types';

interface ShareLinksState {
    isLoadingShareds: boolean;
    sharedLinks: ListShareLinksItem[] | [];//ShareLink[];
    pagination: {
        page: number;
        perPage: number;
        //totalItems: number;
    };
}

const initialState: ShareLinksState = {
    isLoadingShareds: false,
    sharedLinks: [],
    pagination: {
        page: 1,
        perPage: 50,
        //totalItems: 0,
    },
};

export const fetchSharedLinksThunk = createAsyncThunk<ListShareLinksResponse, void, { state: RootState }>(
    'shareds/fetchSharedLinks',
    async (_, { getState }) => {
        const state = getState();
        const page = state.shared.pagination.page;
        const perPage = state.shared.pagination.perPage;
        const response = await shareService.getAllShareLinks(page, perPage, undefined);
        return response;
    },
);

export const sharedSlice = createSlice({
    name: 'shared',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchSharedLinksThunk.pending, (state) => {
                state.isLoadingShareds = true;
            })
            .addCase(fetchSharedLinksThunk.fulfilled, (state, action) => {
                state.isLoadingShareds = false;
                state.sharedLinks = action.payload.items;
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchSharedLinksThunk.rejected, (state) => {
                state.isLoadingShareds = false;
            });
    },
});

export const sharedSelectors = {};

export const sharedActions = sharedSlice.actions;

export const sharedThunks = {
    fetchSharedLinksThunk,
};

export default sharedSlice.reducer;
