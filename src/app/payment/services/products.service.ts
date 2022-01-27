import { ProductData } from '../types';
import { SdkFactory } from '../../core/factory/sdk';

export const fetchProducts = async (): Promise<ProductData[]> => {
  const paymentsClient = SdkFactory.getInstance().createPaymentsClient();
  return paymentsClient.getProducts();
};
