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
};

export default photosDevicesService;
