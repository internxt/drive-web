import { LocalStorageItem } from 'app/core/types';
import envService from 'services/env.service';
import localStorageService from 'services/local-storage.service';
import packageJson from '../../../../package.json';

export interface PhotoDevice {
  uuid: string;
  plainName: string;
  bucket: string;
  status: 'EXISTS' | 'TRASHED' | 'DELETED';
}

const getAuthHeaders = (): Headers =>
  new Headers({
    Authorization: `Bearer ${localStorageService.get(LocalStorageItem.NewToken) ?? ''}`,
    'internxt-client': packageJson.name,
    'internxt-version': packageJson.version,
  });

const photosService = {
  async listDevices(): Promise<PhotoDevice[]> {
    const baseUrl = envService.getVariable('newApi');
    const response = await fetch(`${baseUrl}/photos/devices`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`listDevices failed: ${response.status}`);
    const data: PhotoDevice[] = await response.json();
    return data.filter((d) => d.status === 'EXISTS');
  },

  async deleteDevice(uuid: string): Promise<void> {
    const baseUrl = envService.getVariable('newApi');
    const response = await fetch(`${baseUrl}/photos/devices/${uuid}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`deleteDevice failed: ${response.status}`);
  },
};

export default photosService;
