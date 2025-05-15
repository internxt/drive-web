import { getUserLocation, UserLocation } from '@internxt/sdk';
import { envConfig } from '../../config';

export const userLocation = (): Promise<UserLocation> => {
  return getUserLocation(envConfig.api.location);
};
