import dateService from '../../../app/core/services/date.service';
import sizeService from '../../../app/drive/services/size.service';
import { DriveItemData } from '../../../app/drive/types';
import transformItemService from 'app/drive/services/item-transform.service';
import { items } from '@internxt/lib';
import { t } from 'i18next';
import iconService from 'app/drive/services/icon.service';

export default function BackupListItem({
  item,
  onItemClicked,
}: Readonly<{
  item: DriveItemData;
  onItemClicked: (item: DriveItemData) => void;
}>): JSX.Element {
  const ItemIconComponent = iconService.getItemIcon(item.isFolder, item.type);

  return (
    <div className={'file-list-item group'} data-test={`file-list-${item.isFolder ? 'folder' : 'file'}`}>
      <div className="flex shrink-0 min-w-[200px] grow items-center pr-3">
        {/* ICON */}
        <div className="box-content flex items-center pr-4">
          <div className="relative flex h-10 w-10 justify-center drop-shadow-soft">
            <ItemIconComponent
              className="h-full"
              data-test={`file-list-${
                item.isFolder ? 'folder' : 'file'
              }-${transformItemService.getItemPlainNameWithExtension(item)}`}
            />
          </div>
        </div>

        {/* NAME */}
        <div className="flex w-[200px] grow cursor-pointer items-center truncate pr-2">
          <button
            data-test={`${item.isFolder ? 'folder' : 'file'}-name`}
            className="truncate"
            title={transformItemService.getItemPlainNameWithExtension(item) ?? items.getItemDisplayName(item)}
            onClick={
              (item.isFolder && !item.deleted) || (!item.isFolder && item.status === 'EXISTS')
                ? () => onItemClicked(item)
                : undefined
            }
          >
            <p className="truncate">
              {transformItemService.getItemPlainNameWithExtension(item) ?? items.getItemDisplayName(item)}
            </p>
          </button>
        </div>
      </div>

      {/* DATE */}
      <div className="block shrink-0 w-date items-center whitespace-nowrap">
        {dateService.formatDefaultDate(item.updatedAt, t)}
      </div>

      {/* SIZE */}
      <div className="w-size shrink-0 items-center whitespace-nowrap">
        {sizeService.bytesToString(item.size, false) === '' ? (
          <span className="opacity-25">—</span>
        ) : (
          sizeService.bytesToString(item.size, false)
        )}
      </div>
    </div>
  );
}
