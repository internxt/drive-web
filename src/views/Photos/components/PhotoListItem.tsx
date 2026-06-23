import { useEffect, useRef, useState } from 'react';
import { DriveItemData } from 'app/drive/types';
import dateService from 'services/date.service';
import sizeService from 'app/drive/services/size.service';
import transformItemService from 'app/drive/services/item-transform.service';
import iconService from 'app/drive/services/icon.service';
import { downloadThumbnail } from 'app/drive/services/thumbnail.service';
import { items } from '@internxt/lib';
import { t } from 'i18next';

interface PhotoListItemProps {
  item: DriveItemData;
  onItemClicked: (item: DriveItemData) => void;
}

export default function PhotoListItem({ item, onItemClicked }: Readonly<PhotoListItemProps>): JSX.Element {
  const ItemIconComponent = iconService.getItemIcon(item.isFolder, item.type);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (item.thumbnails && item.thumbnails.length > 0) {
      downloadThumbnail(item.thumbnails[0], false)
        .then((blob) => {
          if (!cancelled) {
            const url = URL.createObjectURL(blob);
            blobUrlRef.current = url;
            setThumbnailUrl(url);
          }
        })
        .catch(() => {
          // thumbnail not available, show icon instead
        });
    }

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [item.uuid]);

  const itemName = transformItemService.getItemPlainNameWithExtension(item) ?? items.getItemDisplayName(item);

  return (
    <div className="file-list-item group" data-test={`file-list-${item.isFolder ? 'folder' : 'file'}`}>
      <div className="flex shrink-0 min-w-[200px] grow items-center pr-3">
        {/* ICON / THUMBNAIL */}
        <div className="box-content flex items-center pr-4">
          <div className="relative flex h-10 w-10 justify-center drop-shadow-soft">
            {thumbnailUrl ? (
              <img
                className="aspect-square h-full max-h-full object-contain object-center"
                src={thumbnailUrl}
                alt={itemName}
              />
            ) : (
              <ItemIconComponent
                className="h-full"
                data-test={`file-list-${item.isFolder ? 'folder' : 'file'}-${itemName}`}
              />
            )}
          </div>
        </div>

        {/* NAME */}
        <div className="flex w-[200px] grow cursor-pointer items-center truncate pr-2">
          <button
            className="truncate"
            title={itemName}
            onClick={
              (item.isFolder && !item.deleted) || (!item.isFolder && item.status === 'EXISTS')
                ? () => onItemClicked(item)
                : undefined
            }
          >
            <p className="truncate">{itemName}</p>
          </button>
        </div>
      </div>

      {/* DATE */}
      <div className="block shrink-0 w-date items-center whitespace-nowrap">
        {dateService.formatDefaultDate(item.updatedAt, t)}
      </div>

      {/* SIZE */}
      <div className="w-size shrink-0 items-center whitespace-nowrap">
        {sizeService.bytesToString(item.size, false) === '' || item.isFolder ? (
          <span className="opacity-25">—</span>
        ) : (
          sizeService.bytesToString(item.size, false)
        )}
      </div>
    </div>
  );
}
