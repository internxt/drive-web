import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendAddShoppersConversion } from './addShoppers.services';

describe('sendAddShoppersConversion', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete (window as any).AddShoppersConversion;
  });

  it('should do nothing if required fields are missing', () => {
    sendAddShoppersConversion({ orderId: '', value: 0, currency: '' });

    expect(document.head.querySelector('#AddShoppers')).toBeNull();
    expect((window as any).AddShoppersConversion).toBeUndefined();
  });

  it('should set AddShoppersConversion and inject script if offerCode is "welcome"', () => {
    const input = {
      orderId: 'order123',
      value: 29.99,
      currency: 'eur',
      offerCode: 'WELCOME',
    };

    sendAddShoppersConversion(input);

    const script = document.head.querySelector('script#AddShoppers');

    expect((window as any).AddShoppersConversion).toEqual({
      order_id: input.orderId,
      value: input.value,
      currency: 'EUR',
      offer_code: input.offerCode,
    });

    expect(script).not.toBeNull();
    expect(script?.getAttribute('src')).toContain('shop.pe/widget/widget_async.js');
  });

  it('should not inject script again if already present', () => {
    const existingScript = document.createElement('script');
    existingScript.id = 'AddShoppers';
    document.head.appendChild(existingScript);

    const spy = vi.spyOn(document, 'createElement');

    sendAddShoppersConversion({
      orderId: 'abc',
      value: 10,
      currency: 'eur',
      offerCode: 'welcome',
    });

    expect(spy).not.toHaveBeenCalledWith('script');
    spy.mockRestore();
  });
});
