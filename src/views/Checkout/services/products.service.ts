import { SdkFactory } from 'app/core/factory/sdk';
import { Tier } from '@internxt/sdk/dist/drive/payments/types/tiers';

export type UserTierFeatures = Tier['featuresPerService'];

export class ProductService {
  public static readonly instance: ProductService = new ProductService();

  readonly getAvailableUserFeatures = async (): Promise<UserTierFeatures> => {
    const paymentsClient = await SdkFactory.getNewApiInstance().createPaymentsClient();
    const userTier = await paymentsClient.getUserTier();

    return userTier.featuresPerService;
  };
}
