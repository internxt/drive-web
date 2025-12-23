import { UserLocation } from '@internxt/sdk';
import { useEffect, useState } from 'react';
import { userLocation } from 'utils';

export const useUserLocation = () => {
  const [location, setLocation] = useState<UserLocation>();

  useEffect(() => {
    fetchUserLocationAndStore();
  }, []);

  const fetchUserLocationAndStore = async (): Promise<UserLocation | undefined> => {
    try {
      const location = await userLocation();
      setLocation(location);
      return location;
    } catch {
      return;
    }
  };

  return {
    location,
    fetchUserLocationAndStore,
  };
};
