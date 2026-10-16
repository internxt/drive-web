import { DriveItemData, SortField } from 'app/drive/types';
import { HeaderProps } from '@internxt/ui/dist/components/data-display/list/ListHeader';
import { Translate } from 'app/i18n/types';
import { OrderDirection, OrderSettings } from 'app/core/types';

export const getListHeaders = (
  translate: Translate,
  isRecents: boolean,
  isTrash: boolean,
  canSortByModified = true,
): HeaderProps<DriveItemData, SortField>[] => {
  const isModifiedOrderable = !isRecents && canSortByModified;
  const headers: HeaderProps<DriveItemData, SortField>[] = [
    {
      label: translate('drive.list.columns.name'),
      width: 'flex grow items-center min-w-driveNameHeader',
      name: 'name',
      orderable: !isRecents,
      defaultDirection: 'ASC',
      buttonDataCy: 'driveListHeaderNameButton',
      textDataCy: 'driveListHeaderNameButtonText',
    },
  ];

  if (isTrash) {
    headers.push(
      {
        label: translate('drive.list.columns.autoDelete'),
        width: 'w-date',
        name: 'expiresAt',
        orderable: true,
        defaultDirection: 'ASC',
      },
      {
        label: translate('drive.list.columns.originalLocation'),
        width: 'w-date',
        name: 'parent',
        orderable: false,
      },
    );
  }

  if (!isTrash) {
    headers.push({
      label: translate('drive.list.columns.modified'),
      width: 'w-date',
      name: 'updatedAt',
      orderable: isModifiedOrderable,
      defaultDirection: 'ASC',
      buttonDataCy: 'driveListHeaderModifiedButton',
    });
  }

  headers.push({
    label: translate('drive.list.columns.size'),
    orderable: false,
    width: 'w-size',
    name: 'size',
  });

  return headers;
};

export const getDriveListOrder = (
  order: OrderSettings,
  driveItemsOrder: string,
  isPersonalDrive: boolean,
): OrderSettings => {
  if (!isPersonalDrive) return order;

  const isDescending = driveItemsOrder === OrderDirection.Desc;
  const direction = isDescending ? OrderDirection.Desc : OrderDirection.Asc;
  return { by: 'name', direction };
};
