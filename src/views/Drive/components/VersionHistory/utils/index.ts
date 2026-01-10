import dateService from 'services/date.service';
import { DriveItemData } from 'app/drive/types';

export const formatVersionDate = (date: string): string => dateService.format(date, 'MMM D, h:mm A');

const ALLOWED_VERSIONING_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'csv'];

export const isVersioningExtensionAllowed = (item?: Pick<DriveItemData, 'type'> | null): boolean => {
  if (!item || !item.type) {
    return false;
  }
  const extension = item.type.toLowerCase();
  return ALLOWED_VERSIONING_EXTENSIONS.includes(extension);
};

export const getDaysUntilExpiration = (expiresAt: string): number => dateService.getDaysUntilExpiration(expiresAt);
