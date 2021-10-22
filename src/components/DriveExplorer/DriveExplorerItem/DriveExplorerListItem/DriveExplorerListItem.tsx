import React, { Fragment, useEffect } from 'react';
import { Dropdown } from 'react-bootstrap';
import * as Unicons from '@iconscout/react-unicons';

import FileDropdownActions from '../../../dropdowns/FileDropdownActions/FileDropdownActions';
import sizeService from '../../../../services/size.service';

import dateService from '../../../../services/date.service';
import { storageActions } from '../../../../store/slices/storage';
import iconService from '../../../../services/icon.service';
import { DriveItemAction, DriveExplorerItemProps } from '..';
import { useAppDispatch } from '../../../../store/hooks';
import useDriveItemActions from '../hooks/useDriveItemActions';
import { useDriveItemDrag, useDriveItemDrop } from '../hooks/useDriveItemDragAndDrop';
import useDriveItemStoreProps from '../hooks/useDriveStoreProps';

import './DriveExplorerListItem.scss';
import { items } from '@internxt/lib';
import useForceUpdate from '../../../../hooks/useForceUpdate';

const DriveExplorerListItem = ({ item }: DriveExplorerItemProps) => {
  const dispatch = useAppDispatch();
  const { isItemSelected, isSomeItemSelected, selectedItems } = useDriveItemStoreProps();
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
        <div className={isEditingName ? 'flex' : 'hidden'}>
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
          {!isEditingName && (
            <Unicons.UilPen onClick={onEditNameButtonClicked} className="file-list-item-edit-name-button" />
          )}
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
        {!item.isFolder ? (
          <input
            onClick={(e) => e.stopPropagation()}
            type="checkbox"
            checked={isItemSelected(item)}
            onChange={onSelectCheckboxChanged}
          />
        ) : null}
      </div>

      {/* ICON */}
      <div className="w-1/12 flex items-center px-3 box-content">
        <div className="h-8 w-8 flex justify-center">
          <ItemIconComponent className="h-full" />
        </div>
      </div>

      {/* NAME */}
      <div className="flex-grow flex items-center w-1 pr-2">{nameNodefactory()}</div>

      {/* HOVER ACTIONS */}
      <div className="pl-3 w-2/12 items-center hidden xl:flex">
        <div className={`${isSomeItemSelected ? 'invisible' : ''} flex`}>
          {!item.isFolder ? (
            <button onClick={onDownloadButtonClicked} className="hover-action mr-3" data-test="download-file-button">
              <Unicons.UilCloudDownload className="h-5" />
            </button>
          ) : null}
          {!item.isFolder ? (
            <button onClick={onShareButtonClicked} className="hover-action mr-3" data-test="share-file-button">
              <Unicons.UilShareAlt className="h-5" />
            </button>
          ) : null}
          <button onClick={onDeleteButtonClicked} className="hover-action" data-test="delete-file-button">
            <Unicons.UilTrashAlt className="h-5" />
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
        {sizeService.bytesToString(item.size, false)}
      </div>

      {/* ACTIONS BUTTON */}
      <div className="flex items-center w-1/12">
        <Dropdown>
          <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-list-item-actions-button">
            <Unicons.UilEllipsisH className="w-full h-full" />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <FileDropdownActions
              hiddenActions={item.isFolder ? [DriveItemAction.Download, DriveItemAction.Share] : []}
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

  return isEditingName ? template : connectDragSource(template);
};

export default DriveExplorerListItem;
