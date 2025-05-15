// tests/userLocation.test.ts
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as sdk from '@internxt/sdk';
import { userLocation } from './userLocation';

vi.mock('@internxt/sdk', () => ({
  getUserLocation: vi.fn(),
}));

vi.mock('../../config', () => ({
  envConfig: {
    api: {
      location: 'https://mocked-location-api.com',
    },
  },
}));

describe('User location function', () => {
  const mockedLocation = {
    ip: '123.45.67.89',
    location: 'ES',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (sdk.getUserLocation as Mock).mockResolvedValue(mockedLocation);
  });

  it('When the user location is requested, then the IP and location (country) are requested', async () => {
    const result = await userLocation();

    expect(result).toEqual(mockedLocation);
  });
});
