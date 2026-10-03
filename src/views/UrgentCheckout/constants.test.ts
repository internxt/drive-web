import { describe, expect, it } from 'vitest';
import {
  URGENT_CHECKOUT_VARIANT_IMAGE,
  UrgentCheckoutVariant,
  DEFAULT_URGENT_CHECKOUT_VARIANT,
  getUrgentCheckoutVariant,
} from './constants';

describe('Resolving the urgent checkout creative variant', () => {
  it.each(Object.values(UrgentCheckoutVariant))('When the %s variant is requested, then it is used', (variant) => {
    expect(getUrgentCheckoutVariant(variant)).toBe(variant);
  });

  it.each([
    ['no variant is in the URL', null],
    ['the variant is empty', ''],
    ['the variant is unknown', 'christmas'],
    ['the variant has the wrong casing', 'Adult'],
  ])('When %s, then the mainstream creative is used', (_, variant) => {
    expect(getUrgentCheckoutVariant(variant)).toBe(DEFAULT_URGENT_CHECKOUT_VARIANT);
    expect(DEFAULT_URGENT_CHECKOUT_VARIANT).toBe(UrgentCheckoutVariant.Mainstream);
  });

  it('When a variant is resolved, then it always has an image to render', () => {
    Object.values(UrgentCheckoutVariant).forEach((variant) => {
      expect(URGENT_CHECKOUT_VARIANT_IMAGE[variant]).toBeTruthy();
    });
  });

  it('When both variants are compared, then each one has its own image', () => {
    expect(URGENT_CHECKOUT_VARIANT_IMAGE[UrgentCheckoutVariant.Adult]).not.toBe(
      URGENT_CHECKOUT_VARIANT_IMAGE[UrgentCheckoutVariant.Mainstream],
    );
  });
});
