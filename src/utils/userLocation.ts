import { UserLocation } from '@internxt/sdk';
import { SdkFactory } from 'app/core/factory/sdk';

export const userLocation = (): Promise<UserLocation> => {
  const client = SdkFactory.getNewApiInstance().createLocationClient();
  return client.getUserLocation();
};
