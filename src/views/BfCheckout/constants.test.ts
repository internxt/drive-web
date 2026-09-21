import { describe, expect, it } from 'vitest';
import {
  BF_CHECKOUT_VARIANT_IMAGE,
  BfCheckoutVariant,
  DEFAULT_BF_CHECKOUT_VARIANT,
  getBfCheckoutVariant,
} from './constants';

describe('Resolving the BF checkout creative variant', () => {
  it.each(Object.values(BfCheckoutVariant))('When the %s variant is requested, then it is used', (variant) => {
    expect(getBfCheckoutVariant(variant)).toBe(variant);
  });

  it.each([
    ['no variant is in the URL', null],
    ['the variant is empty', ''],
    ['the variant is unknown', 'christmas'],
    ['the variant has the wrong casing', 'Adult'],
  ])('When %s, then the mainstream creative is used', (_, variant) => {
    expect(getBfCheckoutVariant(variant)).toBe(DEFAULT_BF_CHECKOUT_VARIANT);
    expect(DEFAULT_BF_CHECKOUT_VARIANT).toBe(BfCheckoutVariant.Mainstream);
  });

  it('When a variant is resolved, then it always has an image to render', () => {
    Object.values(BfCheckoutVariant).forEach((variant) => {
      expect(BF_CHECKOUT_VARIANT_IMAGE[variant]).toBeTruthy();
    });
  });

  it('When both variants are compared, then each one has its own image', () => {
    expect(BF_CHECKOUT_VARIANT_IMAGE[BfCheckoutVariant.Adult]).not.toBe(
      BF_CHECKOUT_VARIANT_IMAGE[BfCheckoutVariant.Mainstream],
    );
  });
});
