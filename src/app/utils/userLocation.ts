import { getUserLocation, UserLocation } from '@internxt/sdk';
import envService from 'app/core/services/env.service';

export const userLocation = (): Promise<UserLocation> => {
  return getUserLocation(envService.getVaribale('location'));
};
