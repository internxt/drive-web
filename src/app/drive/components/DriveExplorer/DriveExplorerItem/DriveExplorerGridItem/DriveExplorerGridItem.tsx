import { createRef, useEffect, useRef, useState } from 'react';
import UilEllipsisH from '@iconscout/react-unicons/icons/uil-ellipsis-h';
import { items } from '@internxt/lib';

import DriveItemDropdownActions from '../../../DriveItemDropdownActions/DriveItemDropdownActions';
import iconService from '../../../../services/icon.service';
import useForceUpdate from '../../../../../core/hooks/useForceUpdate';
import { DriveExplorerItemProps } from '..';
import useDriveItemActions from '../hooks/useDriveItemActions';
import useDriveItemStoreProps from '../hooks/useDriveStoreProps';
import { useDriveItemDrag, useDriveItemDrop } from '../hooks/useDriveItemDragAndDrop';
import { thumbnailablePdfExtension } from 'app/drive/types/file-types';

import './DriveExplorerGridItem.scss';
import { Menu } from '@headlessui/react';

const DriveExplorerGridItem = (props: DriveExplorerItemProps): JSX.Element => {
  const [itemRef] = useState(createRef<HTMLDivElement>());
  const itemButton = useRef(null);
  const [lastRowItem, setLastRowItem] = useState(false);
  const { item } = props;
  const { isItemSelected, isEditingName, dirtyName } = useDriveItemStoreProps();
  const { onItemClicked, onItemRightClicked, onItemDoubleClicked, downloadAndSetThumbnail } = useDriveItemActions(item);
  const { connectDragSource, isDraggingThisItem } = useDriveItemDrag(item);
  const { connectDropTarget, isDraggingOverThisItem } = useDriveItemDrop(item);
  const forceUpdate = useForceUpdate();
  const updateHeight = () => forceUpdate();

  const ṣpanDisplayClass: string = !isEditingName(item) ? 'block' : 'hidden';

  const isDraggingClassNames: string = isDraggingThisItem ? 'opacity-50' : '';
  const isDraggingOverClassNames: string = isDraggingOverThisItem ? 'drag-over-effect' : '';
  const selectedClassNames: string = isItemSelected(item) ? 'bg-blue-10 grid-item-shadow' : '';
  const ItemIconComponent = iconService.getItemIcon(item.isFolder, item.type);
  const height = itemRef.current ? itemRef.current.clientWidth + 'px' : 'auto';

  const handleContextMenu = () => {
    const itemElement = itemRef.current;

    if (!itemElement) return;

    const rect = itemElement.getBoundingClientRect();
    const screenWidth = window.innerWidth;

    const menuLeft = rect.right;
    const menuRight = menuLeft + 100;

    if (menuRight > screenWidth) {
      setLastRowItem(true);
    } else {
      setLastRowItem(false);
    }
  };

  useEffect(() => {
    updateHeight();

    window.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  useEffect(() => {
    if (isItemSelected(item)) {
      handleContextMenu();
    }
  }, [isItemSelected(item)]);

  useEffect(() => {
    downloadAndSetThumbnail();
  }, [item]);

  const template = connectDropTarget(
    <div
      ref={itemRef}
      style={{ height }}
      className={`${selectedClassNames} ${isDraggingOverClassNames} ${isDraggingClassNames}
        group relative box-border rounded-lg p-4 hover:bg-neutral-10`}
      onContextMenu={(e) => onItemRightClicked}
      onClick={(e) => onItemClicked}
      onDoubleClick={onItemDoubleClicked}
      draggable={false}
      onKeyDown={(e) => {}}
    >
      <Menu as="div" className="absolute right-2 top-2 z-10">
        {({ open, close }) => (
          <div className="relative">
            <Menu.Button
              id="dropdown-basic"
              ref={itemButton}
              className="h-5 w-5 cursor-pointer rounded-1/2 bg-white font-bold text-blue-60 opacity-0 transition group-hover:opacity-100"
            >
              <UilEllipsisH className="h-full w-full" />
            </Menu.Button>
            <Menu.Items
              data-tooltip-place="top"
              style={{
                position: 'absolute',
                zIndex: 999,
                right: lastRowItem ? 5 : 'auto',
              }}
            >
              <DriveItemDropdownActions
                openDropdown={open}
                closeDropdown={close}
                onRenameButtonClicked={() => (props.setEditNameItem ? props.setEditNameItem(item) : null)}
                item={item}
              />
            </Menu.Items>
          </div>
        )}
      </Menu>
      <div className="flex h-4/6 w-full items-center justify-center drop-shadow-soft filter">
        {item.currentThumbnail ? (
          <div className="h-full w-full">
            <img
              className={`h-full max-h-full w-full max-w-full object-cover pt-5 
                ${thumbnailablePdfExtension.includes(item.type) ? 'object-top' : 'object-center'}`}
              src={item.currentThumbnail.urlObject}
            />
          </div>
        ) : (
          <ItemIconComponent className="m-auto h-1/2 w-1/2" />
        )}
      </div>
      <div className="mt-3 text-center">
        <div
          className={`${ṣpanDisplayClass} mb-1 cursor-pointer overflow-hidden overflow-ellipsis whitespace-nowrap px-1 text-base text-neutral-900 hover:underline`}
        >
          {items.getItemDisplayName(item)}
        </div>
      </div>
    </div>,
  );

  return (isEditingName(item) ? template : connectDragSource(template)) as JSX.Element;
};

export default DriveExplorerGridItem;
