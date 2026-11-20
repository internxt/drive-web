import { useCallback, useEffect, useState } from 'react';
import { HTTP_STATUS_CODES } from 'app/core/constants';
import errorService from 'services/error.service';
import { PhotoFoldersService } from '../services/photoFolders.service';
import photosDevicesService from '../services/photosDevices.service';
import { PhotoDevice, PhotoMonth } from '../types';

export type PhotoLibraryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'locked' }
  | { status: 'loaded'; devices: PhotoDevice[]; months: PhotoMonth[] };

const isPhotosNotInPlan = (error: unknown) =>
  (error as { status?: number } | undefined)?.status === HTTP_STATUS_CODES.PAYMENT_REQUIRED;

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
      if (isPhotosNotInPlan(error)) {
        setState({ status: 'locked' });
        return;
      }
      errorService.reportError(error);
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  const removeDevice = useCallback((deviceUuid: string) => {
    setState((current) =>
      current.status === 'loaded'
        ? {
            status: 'loaded',
            devices: current.devices.filter((device) => device.uuid !== deviceUuid),
            months: current.months.filter((month) => month.deviceUuid !== deviceUuid),
          }
        : current,
    );
  }, []);

  return { state, retry: loadLibrary, removeDevice };
};
