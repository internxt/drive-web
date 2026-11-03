import { useCallback, useEffect, useState } from 'react';
import errorService from 'services/error.service';
import photosDevicesService from '../services/photosDevices.service';
import { PhotoDevice } from '../types';

export type PhotoDevicesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; devices: PhotoDevice[] };

export const usePhotoDevices = () => {
  const [state, setState] = useState<PhotoDevicesState>({ status: 'loading' });

  const loadDevices = useCallback(async () => {
    setState({ status: 'loading' });

    try {
      const devices = await photosDevicesService.listDevices();
      setState({ status: 'loaded', devices });
    } catch (error) {
      errorService.reportError(error);
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  return { state };
};
