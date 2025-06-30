import { ProductData } from '../types';
import { SdkFactory } from '../../core/factory/sdk';

export const fetchProducts = async (): Promise<ProductData[]> => {
  const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
  return paymentsClient.getProducts() as unknown as ProductData[];
};
