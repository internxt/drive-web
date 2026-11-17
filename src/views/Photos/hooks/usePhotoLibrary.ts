import { useCallback, useEffect, useState } from 'react';
import errorService from 'services/error.service';
import { PhotoFoldersService } from '../services/photoFolders.service';
import photosDevicesService from '../services/photosDevices.service';
import { PhotoDevice, PhotoMonth } from '../types';

export type PhotoLibraryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; devices: PhotoDevice[]; months: PhotoMonth[] };

export const usePhotoLibrary = () => {
  const [state, setState] = useState<PhotoLibraryState>({ status: 'loading' });

  const loadLibrary = useCallback(async () => {
    setState({ status: 'loading' });

    try {
      const devices = await photosDevicesService.listDevices();
      const monthsPerDevice = await Promise.all(
        devices.map((device) => PhotoFoldersService.instance.getDeviceMonths(device.uuid)),
      );
      setState({ status: 'loaded', devices, months: monthsPerDevice.flat() });
    } catch (error) {
      errorService.reportError(error);
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  return { state, retry: loadLibrary };
};
