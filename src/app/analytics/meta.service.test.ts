import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { trackLead, trackPurchase } from './meta.service';
import localStorageService from 'services/local-storage.service';

describe('Meta Tracking Service', () => {
  let mockDataLayer: any[];
  let mockFbq: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDataLayer = [];
    mockFbq = vi.fn();

    Object.defineProperty(globalThis, 'dataLayer', {
      value: mockDataLayer,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, 'fbq', {
      value: mockFbq,
      writable: true,
      configurable: true,
    });
  });

  describe('trackLead', () => {
    it('When valid data is provided, then lead event is pushed to dataLayer', () => {
      const email = 'test@example.com';
      const userID = 'user123';

      trackLead(email, userID);

      expect(mockDataLayer).toHaveLength(1);
      expect(mockDataLayer[0]).toMatchObject({
        event: 'leadSuccessful',
        eventCategory: 'User',
        eventAction: 'registration_complete',
        userEmail: email,
        userID: userID,
      });
    });

    it('When dataLayer is not available, then no event is pushed', () => {
      Object.defineProperty(globalThis, 'dataLayer', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const initialLength = mockDataLayer.length;
      trackLead('test@example.com', 'user123');

      expect(mockDataLayer).toHaveLength(initialLength);
    });

    it('When fbq is not available, then no event is pushed', () => {
      Object.defineProperty(globalThis, 'fbq', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const initialLength = mockDataLayer.length;
      trackLead('test@example.com', 'user123');

      expect(mockDataLayer).toHaveLength(initialLength);
    });
  });

  describe('trackPurchase', () => {
    beforeEach(() => {
      vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
        if (key === 'amountPaid') return '99.99';
        if (key === 'currency') return 'USD';
        return null;
      });
    });

    it('When valid data is provided, then purchase event is pushed to dataLayer', () => {
      const email = 'buyer@example.com';
      const userID = 'user456';

      trackPurchase(email, userID);

      expect(localStorageService.get).toHaveBeenCalledWith('amountPaid');
      expect(localStorageService.get).toHaveBeenCalledWith('currency');
      expect(mockDataLayer).toHaveLength(1);
      expect(mockDataLayer[0]).toMatchObject({
        event: 'purchaseSuccessful',
        ecommerce: {
          value: 99.99,
          currency: 'USD',
        },
        userEmail: email,
        userID: userID,
      });
    });

    it('When dataLayer is not available, then no event is pushed', () => {
      Object.defineProperty(globalThis, 'dataLayer', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      trackPurchase('test@example.com', 'user123');

      expect(localStorageService.get).not.toHaveBeenCalled();
    });

    it('When fbq is not available, then no event is pushed', () => {
      Object.defineProperty(globalThis, 'fbq', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      trackPurchase('test@example.com', 'user123');

      expect(localStorageService.get).not.toHaveBeenCalled();
    });

    it('When amountPaid is not available, then no event is pushed', () => {
      vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
        if (key === 'amountPaid') return null;
        if (key === 'currency') return 'USD';
        return null;
      });

      trackPurchase('test@example.com', 'user123');

      expect(mockDataLayer).toHaveLength(0);
    });

    it('When currency is not available, then no event is pushed', () => {
      vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
        if (key === 'amountPaid') return '99.99';
        if (key === 'currency') return null;
        return null;
      });

      trackPurchase('test@example.com', 'user123');

      expect(mockDataLayer).toHaveLength(0);
    });

    it('When both amountPaid and currency are not available, then no event is pushed', () => {
      vi.spyOn(localStorageService, 'get').mockReturnValue(null);

      trackPurchase('test@example.com', 'user123');

      expect(mockDataLayer).toHaveLength(0);
    });

    it('When amountPaid is a string, then it is correctly parsed as float', () => {
      vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
        if (key === 'amountPaid') return '123.45';
        if (key === 'currency') return 'EUR';
        return null;
      });

      trackPurchase('test@example.com', 'user123');

      expect(mockDataLayer[0].ecommerce.value).toBe(123.45);
      expect(typeof mockDataLayer[0].ecommerce.value).toBe('number');
    });
  });
});
