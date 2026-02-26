import dateService from 'services/date.service';
import { DriveItemData } from 'app/drive/types';

export const formatVersionDate = (date: string): string => dateService.format(date, 'D MMM, YYYY [at] HH:mm');

const ALLOWED_VERSIONING_EXTENSIONS = new Set(['pdf', 'docx', 'xlsx', 'csv']);

export const isVersioningExtensionAllowed = (item?: Pick<DriveItemData, 'type'> | null): boolean => {
  if (!item?.type) {
    return false;
  }
  const extension = item.type.toLowerCase();
  return ALLOWED_VERSIONING_EXTENSIONS.has(extension);
};
