import { Fragment, createRef, useEffect, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import UilEllipsisH from '@iconscout/react-unicons/icons/uil-ellipsis-h';
import { items } from '@internxt/lib';

import DriveItemDropdownActions from '../../../DriveItemDropdownActions/DriveItemDropdownActions';
import iconService from '../../../../services/icon.service';
import useForceUpdate from '../../../../../core/hooks/useForceUpdate';
import { DriveItemAction, DriveExplorerItemProps } from '..';
import useDriveItemActions from '../hooks/useDriveItemActions';
import useDriveItemStoreProps from '../hooks/useDriveStoreProps';
import { useDriveItemDrag, useDriveItemDrop } from '../hooks/useDriveItemDragAndDrop';
import { thumbnailablePdfExtension } from 'app/drive/types/file-types';

import './DriveExplorerGridItem.scss';

const DriveExplorerGridItem = (props: DriveExplorerItemProps): JSX.Element => {
  const [itemRef] = useState(createRef<HTMLDivElement>());
  const { item } = props;
  const { isItemSelected, isEditingName, dirtyName } = useDriveItemStoreProps();
  const {
    nameInputRef,
    onNameChanged,
    onNameBlurred,
    onNameClicked,
    onNameEnterKeyDown,
    onDownloadButtonClicked,
    onRenameButtonClicked,
    onInfoButtonClicked,
    onDeleteButtonClicked,
    onShareButtonClicked,
    onItemClicked,
    onItemRightClicked,
    onItemDoubleClicked,
    downloadAndSetThumbnail
  } = useDriveItemActions(item);
  const { connectDragSource, isDraggingThisItem } = useDriveItemDrag(item);
  const { connectDropTarget, isDraggingOverThisItem } = useDriveItemDrop(item);
  const forceUpdate = useForceUpdate();
  const updateHeight = () => forceUpdate();
  const nameNodeFactory = () => {
    const ṣpanDisplayClass: string = !isEditingName(item) ? 'block' : 'hidden';

    return (
      <Fragment>
        <div className={isEditingName(item) ? 'flex' : 'hidden'}>
          <input
            className="w-full dense border border-white no-ring rect select-text"
            onClick={(e) => e.stopPropagation()}
            ref={nameInputRef}
            type="text"
            value={dirtyName}
            placeholder="Name"
            onChange={onNameChanged}
            onBlur={onNameBlurred}
            onKeyDown={onNameEnterKeyDown}
            autoFocus
          />
          <span className="ml-1">{item.type ? '.' + item.type : ''}</span>
        </div>
        <span
          data-test={`${item.isFolder ? 'folder' : 'file'}-name`}
          className={`${ṣpanDisplayClass} cursor-pointer whitespace-nowrap overflow-hidden overflow-ellipsis text-neutral-900 text-base px-1 hover:underline`}
          onClick={onNameClicked}
          title={items.getItemDisplayName(item)}
        >
          {items.getItemDisplayName(item)}
        </span>
      </Fragment>
    );
  };
  const isDraggingClassNames: string = isDraggingThisItem ? 'opacity-50' : '';
  const isDraggingOverClassNames: string = isDraggingOverThisItem ? 'drag-over-effect' : '';
  const selectedClassNames: string = isItemSelected(item) ? 'bg-blue-10 grid-item-shadow' : '';
  const ItemIconComponent = iconService.getItemIcon(item.isFolder, item.type);
  const height = itemRef.current ? itemRef.current.clientWidth + 'px' : 'auto';

  useEffect(() => {
    updateHeight();

    window.addEventListener('resize', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  useEffect(() => {
    downloadAndSetThumbnail();
  }, [item]);

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

  const template = connectDropTarget(
    <div
      ref={itemRef}
      style={{ height }}
      className={`${selectedClassNames} ${isDraggingOverClassNames} ${isDraggingClassNames} group 
        relative bg-white p-4 box-border rounded-lg hover:bg-neutral-10`}
      onContextMenu={onItemRightClicked}
      onClick={onItemClicked}
      onDoubleClick={onItemDoubleClicked}
      draggable={false}
    >
      <Dropdown>
        <Dropdown.Toggle variant="success" id="dropdown-basic"
          className="top-2 right-2 rounded-1/2 w-5 h-5 bg-white cursor-pointer font-bold text-blue-60 absolute transition opacity-0 group-hover:opacity-100">
          <UilEllipsisH className="w-full h-full" />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <DriveItemDropdownActions
            hiddenActions={item.isFolder ? [DriveItemAction.Download, DriveItemAction.Share] : []}
            onRenameButtonClicked={onRenameButtonClicked}
            onDownloadButtonClicked={onDownloadButtonClicked}
            onShareButtonClicked={onShareButtonClicked}
            onInfoButtonClicked={onInfoButtonClicked}
            onDeleteButtonClicked={onDeleteButtonClicked}
          />
        </Dropdown.Menu>
      </Dropdown>
      <div className="flex justify-center items-center w-full h-4/6 filter drop-shadow-soft">
        {item.currentThumbnail ?
          <div className="w-full h-full">
            <img
              className={`object-cover w-full h-full max-w-full max-h-full pt-5 
                ${thumbnailablePdfExtension.includes(item.type) ? 'object-top' : 'object-center'}`}
              src={item.currentThumbnail.urlObject} />
          </div> :
          <ItemIconComponent className="w-1/2 h-1/2 m-auto" />
        }
      </div>
      <div className="text-center mt-3">
        <div className="mb-1">{nameNodeFactory()}</div>
      </div>
    </div>,
  );

  return (isEditingName(item) ? template : connectDragSource(template)) as JSX.Element;
};

export default DriveExplorerGridItem;
