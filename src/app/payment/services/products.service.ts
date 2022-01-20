import { ProductData } from '../types';
import { createPaymentsClient } from '../../../factory/modules';

export const fetchProducts = async (): Promise<ProductData[]> => {
  return createPaymentsClient().getProducts();
};
