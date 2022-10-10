import React, { Fragment, useEffect } from 'react';
import { Dropdown } from 'react-bootstrap';
/*import UilPen from '@iconscout/react-unicons/icons/uil-pen';
import UilCloudDownload from '@iconscout/react-unicons/icons/uil-cloud-download';
import UilShareAlt from '@iconscout/react-unicons/icons/uil-share-alt';
import UilLinkedAlt from '@iconscout/react-unicons/icons/uil-link';
import UilEllipsisH from '@iconscout/react-unicons/icons/uil-ellipsis-h';
import UilTrashAlt from '@iconscout/react-unicons/icons/uil-trash-alt';*/
import { PencilSimple, Link, Trash, DownloadSimple, DotsThree } from 'phosphor-react';
import { items } from '@internxt/lib';

import DriveItemDropdownActions from '../../../DriveItemDropdownActions/DriveItemDropdownActions';
import sizeService from '../../../../../drive/services/size.service';

import dateService from '../../../../../core/services/date.service';
import { storageActions } from '../../../../../store/slices/storage';
import iconService from '../../../../services/icon.service';
import { DriveExplorerItemProps } from '..';
import { useAppDispatch } from '../../../../../store/hooks';
import useDriveItemActions from '../hooks/useDriveItemActions';
import { useDriveItemDrag, useDriveItemDrop } from '../hooks/useDriveItemDragAndDrop';
import useDriveItemStoreProps from '../hooks/useDriveStoreProps';

import './DriveExplorerListItem.scss';

const DriveExplorerListItem = ({ item }: DriveExplorerItemProps): JSX.Element => {
  const dispatch = useAppDispatch();

  const { isItemSelected, isSomeItemSelected, isEditingName, dirtyName } = useDriveItemStoreProps();

  const {
    nameInputRef,
    //itemIsShared,
    onNameChanged,
    onNameBlurred,
    onNameClicked,
    onEditNameButtonClicked,
    onNameEnterKeyDown,
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
  //const sharedClassNames: string = itemIsShared? 'shared' : '';
  const ItemIconComponent = iconService.getItemIcon(item.isFolder, item.type);
  const onSelectCheckboxChanged = (e: React.ChangeEvent<HTMLInputElement>): void => {
    e.target.checked ? dispatch(storageActions.selectItems([item])) : dispatch(storageActions.deselectItems([item]));
  };

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

  const nameNodefactory = () => {
    const spanDisplayClass: string = !isEditingName(item) ? 'block' : 'hidden';

    return (
      <Fragment>
        <div className={`${isEditingName(item) ? 'flex' : 'hidden'}`}>
          <input
            className="dense no-ring rect select-text border border-white"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
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
        <div className="file-list-item-name flex max-w-full items-center">
          <span
            data-test={`${item.isFolder ? 'folder' : 'file'}-name`}
            className={`${spanDisplayClass} file-list-item-name-span`}
            title={items.getItemDisplayName(item)}
            onClick={onNameClicked}
          >
            {items.getItemDisplayName(item)}
          </span>
          {!isEditingName(item) && (
            <PencilSimple onClick={onEditNameButtonClicked} className="file-list-item-edit-name-button" />
          )}
        </div>
      </Fragment>
    );
  };

  const template = (
    <div
      className={`${selectedClassNames} ${isDraggingOverClassNames} ${isDraggingClassNames} file-list-item group`}
      onContextMenu={onItemRightClicked}
      onClick={onItemClicked}
      onDoubleClick={onItemDoubleClicked}
      data-test={`file-list-${item.isFolder ? 'folder' : 'file'}`}
    >
      {/* SELECTION */}
      <div className="box-content flex w-0.5/12 items-center justify-start pl-3">
        <input
          onClick={(e) => e.stopPropagation()}
          type="checkbox"
          checked={isItemSelected(item)}
          onChange={onSelectCheckboxChanged}
        />
      </div>

      {/* ICON */}
      <div className="box-content flex w-1/12 items-center px-3">
        <div className="flex h-10 w-10 justify-center drop-shadow-soft filter">
          <ItemIconComponent className="h-full" />
          {/*itemIsShared?
          <Link 
          className="items-center justify-center rounded-full flex flex-col h-5 w-5 ml-3 absolute -bottom-1 -right-2 place-self-end rounded-full p-0.5 bg-primary text-white border-2 border-white group-hover:border-slate-50 group-active:border-blue-100" 
          /> : ''*/}
        </div>
      </div>

      {/* NAME */}
      <div className="flex w-1 flex-grow items-center pr-2">{nameNodefactory()}</div>

      {/* HOVER ACTIONS */}
      <div className="hidden w-2/12 items-center pl-3 xl:flex">
        <div className={`${isSomeItemSelected ? 'invisible' : ''} flex`}>
          <button
            onClick={onDownloadButtonClicked}
            className="hover-action mr-3"
            data-test={`download-${item.isFolder ? 'folder' : 'file'}-button`}
          >
            <DownloadSimple className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              onShareButtonClicked && onShareButtonClicked(e);
            }}
            className="hover-action mr-3"
            data-test={`share-${item.isFolder ? 'folder' : 'file'}-button`}
          >
            <Link className="h-5 w-5" />
          </button>
          <button
            onClick={onDeleteButtonClicked}
            className="hover-action"
            data-test={`delete-${item.isFolder ? 'folder' : 'file'}-button`}
          >
            <Trash className="h-5 w-5" />
          </button>
        </div>
      </div>

      {
        /* DROPPABLE ZONE */
        connectDropTarget(<div className="absolute top-0 h-full w-1/2 group-hover:invisible"></div>)
      }

      {/* DATE */}
      <div className="hidden w-3/12 items-center overflow-ellipsis whitespace-nowrap lg:flex">
        {dateService.format(item.updatedAt, 'DD MMMM YYYY. HH:mm')}
      </div>

      {/* SIZE */}
      <div className="flex w-1/12 items-center overflow-ellipsis whitespace-nowrap">
        {sizeService.bytesToString(item.size, false) === '' ? (
          <span className="opacity-25">—</span>
        ) : (
          sizeService.bytesToString(item.size, false)
        )}
      </div>

      {/* ACTIONS BUTTON */}
      <div className="flex w-1/12 items-center">
        <Dropdown>
          <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-list-item-actions-button">
            <DotsThree className="h-full w-full" />
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

  return isEditingName(item) ? template : (connectDragSource(template) as JSX.Element);
};

export default DriveExplorerListItem;
