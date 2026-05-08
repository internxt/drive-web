import { DriveItemData, ListHeaders } from 'app/drive/types';
import { HeaderProps } from '@internxt/ui/dist/components/data-display/list/ListHeader';

export const getListHeaders = (
  translate: (key: string) => string,
  isRecents: boolean,
  isTrash: boolean,
): HeaderProps<DriveItemData, ListHeaders>[] => {
  const headers: HeaderProps<DriveItemData, ListHeaders>[] = [
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
      orderable: !isRecents,
      defaultDirection: 'ASC',
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
