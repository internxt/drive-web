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
