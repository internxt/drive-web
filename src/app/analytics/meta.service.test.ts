/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { trackLead, trackPurchase } from './meta.service';
import localStorageService from 'services/local-storage.service';

describe('Meta Tracking Service', () => {
  let mockDataLayer: any[];
  let mockFbq: Mock;
  let originalDataLayer: any;
  let originalFbq: any;

  beforeEach(() => {
    vi.clearAllMocks();

    originalDataLayer = (globalThis.window as any).dataLayer;
    originalFbq = (globalThis.window as any).fbq;

    mockDataLayer = [];
    mockFbq = vi.fn();

    (globalThis.window as any).dataLayer = mockDataLayer;
    (globalThis.window as any).fbq = mockFbq;
  });

  afterEach(() => {
    (globalThis.window as any).dataLayer = originalDataLayer;
    (globalThis.window as any).fbq = originalFbq;
  });

  describe('trackLead', () => {
    it('When valid data is provided, then lead event is pushed to dataLayer and fbq is called', () => {
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

      expect(mockFbq).toHaveBeenCalledWith('track', 'Lead', {
        content_name: 'User Registration',
        status: 'completed',
      });
    });

    it('When dataLayer is not available, then no event is pushed', () => {
      (globalThis.window as any).dataLayer = undefined;

      trackLead('test@example.com', 'user123');

      expect(mockFbq).not.toHaveBeenCalled();
    });

    it('When fbq is not available, then no event is pushed', () => {
      (globalThis.window as any).fbq = undefined;

      trackLead('test@example.com', 'user123');

      expect(mockDataLayer).toHaveLength(0);
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

    it('When valid data is provided, then purchase event is pushed to dataLayer and fbq is called', () => {
      trackPurchase();

      expect(localStorageService.get).toHaveBeenCalledWith('amountPaid');
      expect(localStorageService.get).toHaveBeenCalledWith('currency');
      expect(mockDataLayer).toHaveLength(1);
      expect(mockDataLayer[0]).toMatchObject({
        event: 'purchaseSuccessful',
        ecommerce: {
          value: 99.99,
          currency: 'USD',
        },
      });

      expect(mockFbq).toHaveBeenCalledWith('track', 'Purchase', {
        value: 99.99,
        currency: 'USD',
        content_type: 'product',
      });
    });

    it('When dataLayer is not available, then no event is pushed', () => {
      (globalThis.window as any).dataLayer = undefined;

      trackPurchase();

      expect(localStorageService.get).not.toHaveBeenCalled();
    });

    it('When fbq is not available, then no event is pushed', () => {
      (globalThis.window as any).fbq = undefined;

      trackPurchase();

      expect(localStorageService.get).not.toHaveBeenCalled();
    });

    it('When amountPaid is not available, then no event is pushed', () => {
      vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
        if (key === 'amountPaid') return null;
        if (key === 'currency') return 'USD';
        return null;
      });

      trackPurchase();

      expect(mockDataLayer).toHaveLength(0);
      expect(mockFbq).not.toHaveBeenCalled();
    });

    it('When currency is not available, then no event is pushed', () => {
      vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
        if (key === 'amountPaid') return '99.99';
        if (key === 'currency') return null;
        return null;
      });

      trackPurchase();

      expect(mockDataLayer).toHaveLength(0);
      expect(mockFbq).not.toHaveBeenCalled();
    });

    it('When both amountPaid and currency are not available, then no event is pushed', () => {
      vi.spyOn(localStorageService, 'get').mockReturnValue(null);

      trackPurchase();

      expect(mockDataLayer).toHaveLength(0);
      expect(mockFbq).not.toHaveBeenCalled();
    });

    it('When amountPaid is a string, then it is correctly parsed as float', () => {
      vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
        if (key === 'amountPaid') return '123.45';
        if (key === 'currency') return 'EUR';
        return null;
      });

      trackPurchase();

      expect(mockDataLayer[0].ecommerce.value).toBe(123.45);
      expect(typeof mockDataLayer[0].ecommerce.value).toBe('number');
      
      expect(mockFbq).toHaveBeenCalledWith('track', 'Purchase', {
        value: 123.45,
        currency: 'EUR',
        content_type: 'product',
      });
    });
  });
});