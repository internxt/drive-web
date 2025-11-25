// tests/userLocation.test.ts
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import * as sdk from '@internxt/sdk';
import { userLocation } from './userLocation';

vi.mock('@internxt/sdk', async () => {
  const actual = await vi.importActual<typeof import('@internxt/sdk')>('@internxt/sdk');
  return {
    ...actual,
    getUserLocation: vi.fn(),
  };
});

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
    vi.resetModules();
    (sdk.getUserLocation as Mock).mockResolvedValue(mockedLocation);
  });

  it('When the user location is requested, then the IP and country are returned', async () => {
    const result = await userLocation();

    expect(result).toEqual(mockedLocation);
  });
});
