import { envConfig } from 'config';
import { getUserLocation, UserLocation } from '@internxt/sdk';

export const userLocation = (): Promise<UserLocation> => {
  return getUserLocation(envConfig.api.location);
};
