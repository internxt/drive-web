import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useUserLocation } from './useUserLocation';
import { userLocation } from 'utils';
import { UserLocation } from '@internxt/sdk';

vi.mock('utils', () => ({
  userLocation: vi.fn(),
}));

describe('User location custom hook', () => {
  const mockUserLocation: UserLocation = {
    location: 'ES',
    ip: '1.1.1.1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    test('When the hook is initialized, then user location is fetched', async () => {
      vi.mocked(userLocation).mockResolvedValue(mockUserLocation);

      renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(userLocation).toHaveBeenCalled();
      });
    });

    test('When user location is fetched successfully, then location state is updated', async () => {
      vi.mocked(userLocation).mockResolvedValue(mockUserLocation);

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.location).toEqual(mockUserLocation);
      });
    });

    test('When fetching user location fails, then location state remains undefined', async () => {
      vi.mocked(userLocation).mockRejectedValue(new Error('Failed to fetch location'));

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(userLocation).toHaveBeenCalled();
      });

      expect(result.current.location).toBeUndefined();
    });
  });

  describe('fetchUserLocationAndStore', () => {
    test('When fetchUserLocationAndStore is called, then location is fetched and stored', async () => {
      vi.mocked(userLocation).mockResolvedValue(mockUserLocation);

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.location).toEqual(mockUserLocation);
      });

      const newLocation: UserLocation = {
        location: 'US',
        ip: '1.1.1.1',
      };
      vi.mocked(userLocation).mockResolvedValue(newLocation);

      let returnedLocation: UserLocation | undefined;
      await act(async () => {
        returnedLocation = await result.current.fetchUserLocationAndStore();
      });

      expect(returnedLocation).toEqual(newLocation);
      expect(result.current.location).toEqual(newLocation);
    });

    test('When fetchUserLocationAndStore is called and it fails, then undefined is returned', async () => {
      vi.mocked(userLocation).mockResolvedValue(mockUserLocation);

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.location).toEqual(mockUserLocation);
      });

      vi.mocked(userLocation).mockRejectedValue(new Error('Network error'));

      let returnedLocation: UserLocation | undefined;
      await act(async () => {
        returnedLocation = await result.current.fetchUserLocationAndStore();
      });

      expect(returnedLocation).toBeUndefined();
    });
  });

  describe('Hook return values', () => {
    test('When the hook is initialized, then it returns all expected values', async () => {
      vi.mocked(userLocation).mockResolvedValue(mockUserLocation);

      const { result } = renderHook(() => useUserLocation());

      await waitFor(() => {
        expect(result.current.location).toBeDefined();
      });

      expect(result.current).toHaveProperty('location');
      expect(result.current).toHaveProperty('fetchUserLocationAndStore');
      expect(typeof result.current.fetchUserLocationAndStore).toBe('function');
    });
  });
});
