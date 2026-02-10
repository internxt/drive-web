import { describe, it, expect, vi, beforeEach } from 'vitest';

import { userLocation } from './userLocation';
import { SdkFactory } from 'app/core/factory/sdk';

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

describe('User location function', () => {
  const mockedLocation = {
    ip: '123.45.67.89',
    location: 'ES',
  };

  const mockGetUserLocation = vi.fn();
  const mockCreateLocationClient = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserLocation.mockResolvedValue(mockedLocation);
    mockCreateLocationClient.mockReturnValue({ getUserLocation: mockGetUserLocation });
    vi.mocked(SdkFactory.getNewApiInstance).mockReturnValue({
      createLocationClient: mockCreateLocationClient,
    } as unknown as SdkFactory);
  });

  it('When the user location is requested, then the IP and country are returned', async () => {
    const result = await userLocation();

    expect(result).toStrictEqual(mockedLocation);
  });
});
