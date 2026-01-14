interface ListHeaderItem {
  label: string;
  width: string;
  name: 'type' | 'name' | 'updatedAt' | 'size' | 'caducityDate';
  orderable: boolean;
  defaultDirection: 'ASC' | 'DESC';
  buttonDataCy?: string;
  textDataCy?: string;
}

export const getListHeaders = (
  translate: (key: string) => string,
  isRecents: boolean,
  isTrash: boolean,
): ListHeaderItem[] => {
  const headers: ListHeaderItem[] = [
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
    headers.push({
      label: translate('drive.list.columns.autoDelete'),
      width: 'w-date',
      name: 'caducityDate',
      orderable: true,
      defaultDirection: 'ASC',
    });
  }

  headers.push(
    {
      label: translate('drive.list.columns.modified'),
      width: 'w-date',
      name: 'updatedAt',
      orderable: !isRecents,
      defaultDirection: 'ASC',
    },
    {
      label: translate('drive.list.columns.size'),
      orderable: !isRecents && !isTrash,
      defaultDirection: 'ASC',
      width: 'w-size',
      name: 'size',
    },
  );

  return headers;
};
