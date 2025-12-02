import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { trackLead, trackPurchase } from './meta.service';
import localStorageService from 'services/local-storage.service';

describe('Meta Tracking Service', () => {
  let mockDataLayer: any[];
  let mockFbq: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDataLayer = [];
    mockFbq = vi.fn();

    globalThis.window.dataLayer = mockDataLayer;
    globalThis.window.fbq = mockFbq;
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

    it('When fbq is not available, then no event is pushed', () => {
      globalThis.window.fbq = undefined;

      const initialLength = mockDataLayer.length;
      trackLead('test@example.com', 'user123');

      expect(mockDataLayer).toHaveLength(initialLength);
    });
  });

  describe('trackPurchase', () => {
    const mockUser = { email: 'buyer@example.com', uuid: 'user-uuid-123' };

    beforeEach(() => {
      vi.spyOn(localStorageService, 'getUser').mockReturnValue(mockUser as any);

      globalThis.window.fbq = mockFbq;
    });

    it('When valid subscription data is provided, then purchase event is sent to fbq with subscriptionId', () => {
      vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
        if (key === 'amountPaid') return '99.99';
        if (key === 'currency') return 'USD';
        if (key === 'productName') return '2TB Plan';
        if (key === 'priceId') return 'price_123';
        if (key === 'subscriptionId') return 'sub_123';
        return null;
      });

      trackPurchase();

      expect(mockFbq).toHaveBeenCalledWith(
        'track',
        'Purchase',
        {
          value: 99.99,
          currency: 'USD',
          content_name: '2TB Plan',
          content_ids: ['price_123'],
          content_type: 'product',
          user_email: mockUser.email,
          external_id: mockUser.uuid,
        },
        { eventID: 'sub_123' },
      );
    });

    it('When valid lifetime data is provided, then purchase event is sent to fbq with paymentIntentId', () => {
      vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
        if (key === 'amountPaid') return '299.99';
        if (key === 'currency') return 'EUR';
        if (key === 'paymentIntentId') return 'pi_123';
        return null;
      });

      trackPurchase();

      expect(mockFbq).toHaveBeenCalledWith(
        'track',
        'Purchase',
        expect.objectContaining({
          value: 299.99,
          currency: 'EUR',
        }),
        { eventID: 'pi_123' },
      );
    });

    it('When no IDs are provided, it generates a fallback UUID', () => {
      vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
        if (key === 'amountPaid') return '10.00';
        if (key === 'currency') return 'EUR';
        return null;
      });

      trackPurchase();

      expect(mockFbq).toHaveBeenCalledWith(
        'track',
        'Purchase',
        expect.anything(),
        expect.objectContaining({
          eventID: expect.any(String),
        }),
      );
    });

    it('When fbq is not available, then no event is pushed', () => {
      globalThis.window.fbq = undefined;

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

      expect(mockFbq).not.toHaveBeenCalled();
    });

    it('When currency is not available, then no event is pushed', () => {
      vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
        if (key === 'amountPaid') return '99.99';
        if (key === 'currency') return null;
        return null;
      });

      trackPurchase();

      expect(mockFbq).not.toHaveBeenCalled();
    });

    it('When amountPaid is a string, then it is correctly parsed as float', () => {
      vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
        if (key === 'amountPaid') return '123.45';
        if (key === 'currency') return 'EUR';
        return null;
      });

      trackPurchase();

      expect(mockFbq).toHaveBeenCalledWith(
        'track',
        'Purchase',
        expect.objectContaining({
          value: 123.45,
        }),
        expect.anything(),
      );
    });
  });
});
