import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { RootState } from '../..';
import { IStripePlan, IStripeProduct } from '../../../models/interfaces';
import { loadAvailablePlans, loadAvailableProducts, loadAvailableTeamsPlans, loadAvailableTeamsProducts } from '../../../services/products.service';

interface ProductsState {
  isLoadingIndividualProducts: boolean;
  isLoadingTeamProducts: boolean;
  individualProducts: IStripeProduct[];
  individualProductsPlans: IStripePlan[][];
  teamProducts: IStripeProduct[];
  teamProductsPlans: IStripePlan[][];
}

const initialState: ProductsState = {
  isLoadingIndividualProducts: false,
  isLoadingTeamProducts: false,
  individualProducts: [],
  individualProductsPlans: [],
  teamProducts: [],
  teamProductsPlans: []
};

export const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'products/initialize',
  async (payload: void, { dispatch, getState }) => {
    const isAuthenticated = getState().user.isAuthenticated;
    const promises: Promise<void>[] = [];

    if (isAuthenticated) {
      promises.push(dispatch(fetchIndividualProductsThunk()).then());
      promises.push(dispatch(fetchTeamProductsThunk()).then());
    }

    await Promise.all(promises);
  }
);

export const fetchIndividualProductsThunk = createAsyncThunk<{ products: IStripeProduct[], plans: IStripePlan[][] }, void, { state: RootState }>(
  'products/fetchIndividualProductsThunk',
  async (payload: void, { dispatch, getState }) => {
    const products = await loadAvailableProducts();
    const plans: IStripePlan[][] = [];

    for (const product of products) {
      plans.push(await loadAvailablePlans(product));
    }

    return { products, plans };
  }
);

export const fetchTeamProductsThunk = createAsyncThunk<{ products: IStripeProduct[], plans: IStripePlan[][] }, void, { state: RootState }>(
  'products/fetchTeamProductsThunk',
  async (payload: void, { dispatch, getState }) => {
    const products = await loadAvailableTeamsProducts();
    const plans: IStripePlan[][] = [];

    for (const product of products) {
      plans.push(await loadAvailableTeamsPlans(product));
    }

    return { products, plans };
  }
);

export const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(initializeThunk.pending, (state, action) => { })
      .addCase(initializeThunk.fulfilled, (state, action) => { })
      .addCase(initializeThunk.rejected, (state, action) => { });

    builder
      .addCase(fetchIndividualProductsThunk.pending, (state, action) => {
        state.isLoadingIndividualProducts = true;
      })
      .addCase(fetchIndividualProductsThunk.fulfilled, (state, action) => {
        state.isLoadingIndividualProducts = false;
        state.individualProducts = action.payload.products;
        state.individualProductsPlans = action.payload.plans;
      })
      .addCase(fetchIndividualProductsThunk.rejected, (state, action) => {
        state.isLoadingIndividualProducts = false;
      });

    builder
      .addCase(fetchTeamProductsThunk.pending, (state, action) => {
        state.isLoadingTeamProducts = true;
      })
      .addCase(fetchTeamProductsThunk.fulfilled, (state, action) => {
        state.isLoadingTeamProducts = false;
        state.teamProducts = action.payload.products;
        state.teamProductsPlans = action.payload.plans;
      })
      .addCase(fetchTeamProductsThunk.rejected, (state, action) => {
        state.isLoadingTeamProducts = false;
      });
  }
});

export const productsActions = productsSlice.actions;

export const productsThunks = {
  initializeThunk,
  fetchIndividualProductsThunk,
  fetchTeamProductsThunk
};

export const productsSelectors = {};

export default productsSlice.reducer;