import { ProductData } from '../types';
import { SdkFactory } from 'app/core/factory/sdk';
import { Tier } from '@internxt/sdk/dist/drive/payments/types/tiers';

export type UserTierFeatures = Tier['featuresPerService'];

// TODO: REMOVE THIS USELESS CALL
export const fetchProducts = async (): Promise<ProductData[]> => {
  const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
  return paymentsClient.getProducts() as unknown as ProductData[];
};

export class ProductService {
  public static readonly instance: ProductService = new ProductService();

  readonly getAvailableUserFeatures = async (): Promise<UserTierFeatures> => {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    const userTier = await paymentsClient.getUserTier();

    return userTier.featuresPerService;
  };
}
