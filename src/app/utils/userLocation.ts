import { getUserLocation, UserLocation } from '@internxt/sdk';
import { envConfig } from 'app/core/services/env.service';

export const userLocation = (): Promise<UserLocation> => {
  return getUserLocation(envConfig.api.location);
};
