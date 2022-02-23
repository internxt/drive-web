import React, { Fragment } from 'react';
import { Dropdown } from 'react-bootstrap';
import UilPen from '@iconscout/react-unicons/icons/uil-pen';
import UilCloudDownload from '@iconscout/react-unicons/icons/uil-cloud-download';
import UilShareAlt from '@iconscout/react-unicons/icons/uil-share-alt';
import UilEllipsisH from '@iconscout/react-unicons/icons/uil-ellipsis-h';
import UilTrashAlt from '@iconscout/react-unicons/icons/uil-trash-alt';
import { items } from '@internxt/lib';

import DriveItemDropdownActions from '../../../DriveItemDropdownActions/DriveItemDropdownActions';
import sizeService from '../../../../../drive/services/size.service';

import dateService from '../../../../../core/services/date.service';
import { storageActions } from '../../../../../store/slices/storage';
import iconService from '../../../../services/icon.service';
import { DriveExplorerItemProps, DriveItemAction } from '..';
import { useAppDispatch } from '../../../../../store/hooks';
import useDriveItemActions from '../hooks/useDriveItemActions';
import { useDriveItemDrag, useDriveItemDrop } from '../hooks/useDriveItemDragAndDrop';
import useDriveItemStoreProps from '../hooks/useDriveStoreProps';

import './DriveExplorerListItem.scss';

const DriveExplorerListItem = ({ item }: DriveExplorerItemProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const { isItemSelected, isSomeItemSelected } = useDriveItemStoreProps();
  const {
    isEditingName,
    dirtyName,
    nameInputRef,
    onNameChanged,
    onNameBlurred,
    onNameClicked,
    onEditNameButtonClicked,
    onNameEnterKeyPressed,
    onDownloadButtonClicked,
    onRenameButtonClicked,
    onInfoButtonClicked,
    onDeleteButtonClicked,
    onShareButtonClicked,
    onItemClicked,
    onItemRightClicked,
    onItemDoubleClicked,
  } = useDriveItemActions(item);
  const { connectDragSource, isDraggingThisItem } = useDriveItemDrag(item);
  const { connectDropTarget, isDraggingOverThisItem } = useDriveItemDrop(item);
  const isDraggingClassNames: string = isDraggingThisItem ? 'is-dragging' : '';
  const isDraggingOverClassNames: string = isDraggingOverThisItem ? 'drag-over-effect' : '';
  const selectedClassNames: string = isItemSelected(item) ? 'selected' : '';
  const ItemIconComponent = iconService.getItemIcon(item.isFolder, item.type);
  const onSelectCheckboxChanged = (e: React.ChangeEvent<HTMLInputElement>): void => {
    e.target.checked ? dispatch(storageActions.selectItems([item])) : dispatch(storageActions.deselectItems([item]));
  };
  const nameNodefactory = () => {
    const spanDisplayClass: string = !isEditingName ? 'block' : 'hidden';

    return (
      <Fragment>
        <div className={`${isEditingName ? 'flex' : 'hidden'}`}>
          <input
            className="dense border border-white no-ring rect select-text"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            ref={nameInputRef}
            type="text"
            value={dirtyName}
            placeholder="Name"
            onChange={onNameChanged}
            onBlur={onNameBlurred}
            onKeyPress={onNameEnterKeyPressed}
            autoFocus
          />
          <span className="ml-1">{item.type ? '.' + item.type : ''}</span>
        </div>
        <div className="file-list-item-name flex items-center max-w-full">
          <span
            data-test={`${item.isFolder ? 'folder' : 'file'}-name`}
            className={`${spanDisplayClass} file-list-item-name-span`}
            onClick={onNameClicked}
          >
            {items.getItemDisplayName(item)}
          </span>
          {!isEditingName && <UilPen onClick={onEditNameButtonClicked} className="file-list-item-edit-name-button" />}
        </div>
      </Fragment>
    );
  };
  const template = (
    <div
      className={`${selectedClassNames} ${isDraggingOverClassNames} ${isDraggingClassNames} group file-list-item`}
      onContextMenu={onItemRightClicked}
      onClick={onItemClicked}
      onDoubleClick={onItemDoubleClicked}
      data-test={`file-list-${item.isFolder ? 'folder' : 'file'}`}
    >
      {/* SELECTION */}
      <div className="w-0.5/12 pl-3 flex items-center justify-start box-content">
        <input
          onClick={(e) => e.stopPropagation()}
          type="checkbox"
          checked={isItemSelected(item)}
          onChange={onSelectCheckboxChanged}
        />
      </div>

      {/* ICON */}
      <div className="w-1/12 flex items-center px-3 box-content">
        <div className="h-10 w-10 flex justify-center filter drop-shadow-soft">
          <ItemIconComponent className="h-full" />
        </div>
      </div>

      {/* NAME */}
      <div className="flex-grow flex items-center w-1 pr-2">{nameNodefactory()}</div>

      {/* HOVER ACTIONS */}
      <div className="pl-3 w-2/12 items-center hidden xl:flex">
        <div className={`${isSomeItemSelected ? 'invisible' : ''} flex`}>
          <button
            onClick={onDownloadButtonClicked}
            className="hover-action mr-3"
            data-test={`download-${item.isFolder ? 'folder' : 'file'}-button`}
          >
            <UilCloudDownload className="h-5" />
          </button>
          <button
            onClick={onShareButtonClicked}
            className="hover-action mr-3"
            data-test={`share-${item.isFolder ? 'folder' : 'file'}-button`}
          >
            <UilShareAlt className="h-5" />
          </button>
          <button
            onClick={onDeleteButtonClicked}
            className="hover-action"
            data-test={`delete-${item.isFolder ? 'folder' : 'file'}-button`}
          >
            <UilTrashAlt className="h-5" />
          </button>
        </div>
      </div>

      {
        /* DROPPABLE ZONE */ connectDropTarget(
          <div className="group-hover:invisible absolute h-full w-1/2 top-0"></div>,
        )
      }

      {/* DATE */}
      <div className="hidden lg:flex items-center w-3/12 whitespace-nowrap overflow-ellipsis">
        {dateService.format(item.updatedAt, 'DD MMMM YYYY. HH:mm')}
      </div>

      {/* SIZE */}
      <div className="flex items-center w-1/12 whitespace-nowrap overflow-ellipsis">
        {sizeService.bytesToString(item.size, false) === '' ?
          <span className="opacity-25">—</span>
          :
          sizeService.bytesToString(item.size, false)
        }
      </div>

      {/* ACTIONS BUTTON */}
      <div className="flex items-center w-1/12">
        <Dropdown>
          <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-list-item-actions-button">
            <UilEllipsisH className="w-full h-full" />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <DriveItemDropdownActions
              hiddenActions={[]}
              onRenameButtonClicked={onRenameButtonClicked}
              onDownloadButtonClicked={onDownloadButtonClicked}
              onShareButtonClicked={onShareButtonClicked}
              onInfoButtonClicked={onInfoButtonClicked}
              onDeleteButtonClicked={onDeleteButtonClicked}
            />
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </div>
  );

  return isEditingName ? template : (connectDragSource(template) as JSX.Element);
};

export default DriveExplorerListItem;
