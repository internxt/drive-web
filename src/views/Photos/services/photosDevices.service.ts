import { SdkFactory } from 'app/core/factory/sdk';
import { PhotoDevice } from '../types';

const photosDevicesService = {
  async listDevices(): Promise<PhotoDevice[]> {
    const photosClient = SdkFactory.getNewApiInstance().createPhotosClient();
    const devices = await photosClient.listDevices();
    return devices
      .filter((device) => device.status === 'EXISTS')
      .map((device) => ({ uuid: device.uuid, name: device.plainName }));
  },

  /** Deletes the device and every photo backed up from it, for good. */
  deleteDevice(deviceUuid: string): Promise<void> {
    const photosClient = SdkFactory.getNewApiInstance().createPhotosClient();
    return photosClient.deleteDevice(deviceUuid);
  },
};

export default photosDevicesService;
