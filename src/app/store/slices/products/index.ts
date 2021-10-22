import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { RootState } from '../..';
import { fetchProducts } from '../../../payment/services/products.service';
import { ProductData, RenewalPeriod } from '../../../payment/types';

interface ProductsState {
  isLoading: boolean;
  allProducts: ProductData[];
}

const initialState: ProductsState = {
  isLoading: false,
  allProducts: [],
};

export const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'products/initialize',
  async (payload: void, { dispatch, getState }) => {
    const isAuthenticated = getState().user.isAuthenticated;

    if (isAuthenticated) {
      await dispatch(fetchProductsThunk());
    }
  },
);

export const fetchProductsThunk = createAsyncThunk<{ products: ProductData[] }, void, { state: RootState }>(
  'products/fetchProducts',
  async () => {
    const products = await fetchProducts();

    return { products };
  },
);

export const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(initializeThunk.pending, () => undefined)
      .addCase(initializeThunk.fulfilled, () => undefined)
      .addCase(initializeThunk.rejected, () => undefined);

    builder
      .addCase(fetchProductsThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchProductsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.allProducts = action.payload.products;
      })
      .addCase(fetchProductsThunk.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const productsActions = productsSlice.actions;

export const productsThunks = {
  initializeThunk,
  fetchProductsThunk,
};

export const productsSelectors = {
  individualProducts(state: RootState): (renewalPeriod: RenewalPeriod) => ProductData[] {
    return (renewalPeriod) =>
      state.products.allProducts.filter(
        (product) => product.metadata.is_drive && product.renewalPeriod === renewalPeriod,
      );
  },
  teamProducts(state: RootState): (renewalPeriod: RenewalPeriod) => ProductData[] {
    return (renewalPeriod) =>
      state.products.allProducts.filter(
        (product) => product.metadata.is_teams && product.renewalPeriod === renewalPeriod,
      );
  },
};

export default productsSlice.reducer;
