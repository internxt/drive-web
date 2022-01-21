import { ProductData } from '../types';
import { createPaymentsClient } from '../../core/factory/sdk';

export const fetchProducts = async (): Promise<ProductData[]> => {
  return createPaymentsClient().getProducts();
};
