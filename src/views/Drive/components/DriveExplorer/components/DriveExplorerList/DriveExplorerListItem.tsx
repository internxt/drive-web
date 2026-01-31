import { items } from '@internxt/lib';
import usersIcon from 'assets/icons/users.svg';
import { useEffect, useMemo } from 'react';
import { DriveExplorerItemProps } from '../../types';
import dateService from 'services/date.service';
import transformItemService from 'app/drive/services/item-transform.service';
import sizeService from 'app/drive/services/size.service';
import iconService from 'app/drive/services/icon.service';
import { useDriveItemActions, useDriveItemDrag, useDriveItemDrop, useDriveItemStoreProps } from '../../../../hooks';
import './DriveExplorerListItem.scss';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { WarningCircle } from '@phosphor-icons/react';

const getItemClassNames = (isSelected: boolean, isDraggingOver: boolean, isDragging: boolean): string => {
  const selectedClass = isSelected ? 'selected' : '';
  const draggingOverClass = isDraggingOver ? 'drag-over-effect' : '';
  const draggingClass = isDragging ? 'is-dragging' : '';
  return `${selectedClass} ${draggingOverClass} ${draggingClass} file-list-item group`;
};

const isItemInteractive = (item: DriveExplorerItemProps['item']): boolean => {
  return (item.isFolder && !item.deleted) || (!item.isFolder && item.status === 'EXISTS');
};

const URGENT_AUTO_DELETE_THRESHOLD_DAYS = 2;

const getAutoDeleteStatusInfo = (
  days: number,
  translate: (key: string, options?: { count?: number }) => string,
): { text: string; isUrgent: boolean } => {
  const isUrgent = days <= URGENT_AUTO_DELETE_THRESHOLD_DAYS;
  return {
    text: translate('trash.autoDelete.inDays', { count: days }),
    isUrgent,
  };
};

const DriveExplorerListItem = ({ item, isTrash }: DriveExplorerItemProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const { isItemSelected, isEditingName } = useDriveItemStoreProps();
  const { nameInputRef, onNameClicked, onItemClicked, onItemDoubleClicked, downloadAndSetThumbnail } =
    useDriveItemActions(item);

  const { connectDragSource, isDraggingThisItem } = useDriveItemDrag(item);
  const { connectDropTarget, isDraggingOverThisItem } = useDriveItemDrop(item);
  const ItemIconComponent = iconService.getItemIcon(item.isFolder, item.type);

  const daysUntilDelete = isTrash ? dateService.calculateDaysUntilDate(item.caducityDate) : 0;
  const autoDeleteStatusInfo = useMemo(
    () => (isTrash && daysUntilDelete > 0 ? getAutoDeleteStatusInfo(daysUntilDelete, translate) : null),
    [isTrash, daysUntilDelete, translate],
  );

  useEffect(() => {
    if (isEditingName(item)) {
      const current = nameInputRef.current;
      if (current && current !== null) {
        nameInputRef.current.selectionStart = nameInputRef.current.value.length;
        nameInputRef.current.selectionEnd = nameInputRef.current.value.length;
        nameInputRef.current.focus();
      }
    }
  }, [isEditingName(item)]);

  useEffect(() => {
    downloadAndSetThumbnail();
  }, [item]);

  const isItemShared = (item.sharings?.length ?? 0) > 0;
  const isInteractive = isItemInteractive(item);
  const itemClassNames = getItemClassNames(isItemSelected(item), isDraggingOverThisItem, isDraggingThisItem);

  const template = (
    <div
      role="none"
      className={itemClassNames}
      onClick={onItemClicked}
      onDoubleClick={isInteractive ? onItemDoubleClicked : undefined}
      data-test={`file-list-${item.isFolder ? 'folder' : 'file'}`}
    >
      <div className="flex shrink-0 min-w-activity grow items-center pr-3">
        {/* ICON */}
        <div className="box-content flex items-center pr-4">
          <div className="relative flex h-10 w-10 justify-center drop-shadow-soft">
            {item.currentThumbnail ? (
              <div className="h-full w-full">
                <img
                  className="aspect-square h-full max-h-full object-contain object-center"
                  src={item.currentThumbnail.urlObject}
                  alt={transformItemService.getItemPlainNameWithExtension(item)}
                  data-test={`file-list-${
                    item.isFolder ? 'folder' : 'file'
                  }-${transformItemService.getItemPlainNameWithExtension(item)}`}
                />
              </div>
            ) : (
              <ItemIconComponent
                className="h-full"
                data-test={`file-list-${
                  item.isFolder ? 'folder' : 'file'
                }-${transformItemService.getItemPlainNameWithExtension(item)}`}
              />
            )}
            {isItemShared && (
              <img
                className="absolute -bottom-1 -right-2 ml-3 flex h-5 w-5 flex-col items-center justify-center place-self-end rounded-full border-2 border-white bg-primary p-0.5 text-white dark:border-surface"
                src={usersIcon}
                width={13}
                alt="shared users"
              />
            )}
          </div>
        </div>

        {/* NAME */}
        <div className="flex w-activity grow cursor-pointer items-center truncate pr-2">
          <button
            data-test={`${item.isFolder ? 'folder' : 'file'}-name`}
            className="truncate"
            title={transformItemService.getItemPlainNameWithExtension(item) ?? items.getItemDisplayName(item)}
            onClick={isInteractive ? onNameClicked : undefined}
          >
            <p className="truncate">
              {transformItemService.getItemPlainNameWithExtension(item) ?? items.getItemDisplayName(item)}
            </p>
          </button>
        </div>
      </div>

      {
        /* DROPPABLE ZONE */
        isInteractive && connectDropTarget(<div className="absolute top-0 h-full w-1/2 group-hover:invisible"></div>)
      }

      {/* AUTO-DELETE (only for trash) */}
      {isTrash && autoDeleteStatusInfo && (
        <div className="block lg:pl-4 shrink-0 w-date items-center whitespace-nowrap">
          <div className={`flex items-center gap-1 ${autoDeleteStatusInfo.isUrgent ? 'text-red-dark' : ''}`}>
            <WarningCircle size={20} className="shrink-0" />
            <span>{autoDeleteStatusInfo.text}</span>
          </div>
        </div>
      )}

      {/* DATE */}
      <div className="block lg:pl-4 shrink-0 w-date items-center whitespace-nowrap">
        {dateService.formatDefaultDate(item.updatedAt, translate)}
      </div>

      {/* SIZE */}
      <div className="w-size lg:pl-4 shrink-0 items-center whitespace-nowrap">
        {sizeService.bytesToString(item.size, false) === '' ? (
          <span className="opacity-25">—</span>
        ) : (
          sizeService.bytesToString(item.size, false)
        )}
      </div>
    </div>
  );

  return isEditingName(item) ? template : (connectDragSource(template) as JSX.Element);
};

export default DriveExplorerListItem;
