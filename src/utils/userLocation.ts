import { getUserLocation, UserLocation } from '@internxt/sdk';
import envService from 'services/env.service';

export const userLocation = (): Promise<UserLocation> => {
  return getUserLocation(envService.getVariable('location'));
};
