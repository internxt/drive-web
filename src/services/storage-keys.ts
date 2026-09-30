import { LocalStorageItem } from 'app/core/types';

export const BACKUP_KEY = {
  SEEN_AT: 'backup_key_seen_at',
  ACKNOWLEDGED_AT: 'backup_key_acknowledged_at',
};

export const THEMES = {
  ID_MANAGEMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY: LocalStorageItem.IdManagementTheme,
  ENVIRONMENT_THEME_AVAILABLE_LOCAL_STORAGE_KEY: LocalStorageItem.EnvironmentTheme,
  SUMMER_THEME_AVAILABLE_LOCAL_STORAGE_KEY: LocalStorageItem.SummerTheme,
  STAR_WARS_THEME_AVAILABLE_LOCAL_STORAGE_KEY: LocalStorageItem.StarWarsTheme,
  HALLOWEEN_THEME_AVAILABLE_LOCAL_STORAGE_KEY: LocalStorageItem.HalloweenTheme,
  CHRISTMAS_THEME_AVAILABLE_LOCAL_STORAGE_KEY: LocalStorageItem.ChristmasTheme,
  SUPERBOWL_THEME_AVAILABLE_LOCAL_STORAGE_KEY: LocalStorageItem.SuperbawlTheme,
  STPATRICKS_THEME_AVAILABLE_LOCAL_STORAGE_KEY: LocalStorageItem.StpatricksTheme,
  ANNIVERSARY_THEME_AVAILABLE_LOCAL_STORAGE_KEY: LocalStorageItem.AnniversaryTheme,
};

export const CHECKOUT_LOCAL_STORAGE_ITEMS: LocalStorageItem[] = [
  LocalStorageItem.CheckoutItemData,
  LocalStorageItem.ItemOriginalPrice,
];

export const PAYMENT_LOCAL_STORAGE_ITEMS: LocalStorageItem[] = [
  LocalStorageItem.SubscriptionID,
  LocalStorageItem.PaymentIntentID,
  LocalStorageItem.CheckoutIntentSecret,
  LocalStorageItem.PriceId,
  LocalStorageItem.ProductName,
  LocalStorageItem.Currency,
  LocalStorageItem.AmountPaid,
  LocalStorageItem.CouponCode,
];

export const PURCHASE_LOCAL_STORAGE_ITEMS: LocalStorageItem[] = [
  ...CHECKOUT_LOCAL_STORAGE_ITEMS,
  ...PAYMENT_LOCAL_STORAGE_ITEMS,
];

export const ATTRIBUTION_LOCAL_STORAGE_ITEMS: LocalStorageItem[] = [
  LocalStorageItem.GCLID,
  LocalStorageItem.UccStorageKey,
];
