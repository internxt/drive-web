import dateService from '../../../core/services/date.service';
import { DriveItemData } from '../../../drive/types';
import iconService from '../../../drive/services/icon.service';
import sizeService from '../../../drive/services/size.service';

export default function BackupsAsFoldersListItem({
  item,
  onClick,
  onDoubleClick,
}: {
  item: DriveItemData;
  onClick: (target: typeof item) => void;
  onDoubleClick: (target: typeof item) => void;
}): JSX.Element {
  const Icon = iconService.getItemIcon(item.isFolder, item.type);
  const size = 'size' in item ? sizeService.bytesToString(item.size) : '';
  const displayName = item.type ? `${item.name}.${item.type}` : item.name;

  return (
    <div
      className={'flex flex-grow items-center'}
      onClick={() => onClick(item)}
      onDoubleClick={() => onDoubleClick(item)}
    >
      <div className="box-content flex w-0.5/12 items-center justify-center px-3">
        <Icon className={'h-8 w-8'} />
      </div>
      <p className="flex-1 truncate pr-3">{displayName}</p>
      <div className="hidden w-3/12 items-center lg:flex">
        {dateService.format(item.createdAt, 'DD MMMM YYYY. HH:mm')}
      </div>
      <div className="flex w-2/12 items-center">{size}</div>
    </div>
  );
}
