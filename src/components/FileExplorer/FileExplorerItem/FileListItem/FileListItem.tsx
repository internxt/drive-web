import React, { Fragment, ReactNode } from 'react';
import { Dropdown } from 'react-bootstrap';
import * as Unicons from '@iconscout/react-unicons';

import FileDropdownActions from '../../../dropdowns/FileDropdownActions/FileDropdownActions';
import sizeService from '../../../../services/size.service';

import './FileListItem.scss';
import dateService from '../../../../services/date.service';
import { storageActions } from '../../../../store/slices/storage';
import iconService from '../../../../services/icon.service';
import { FileExplorerItemViewProps } from '../fileExplorerItemComposition';
import fileExplorerItemComposition from '../fileExplorerItemComposition';
import { items } from '@internxt/lib';
import { DriveItemAction } from '..';

class FileListItem extends React.Component<FileExplorerItemViewProps> {
  get nameNode(): JSX.Element {
    const {
      item,
      onNameChanged,
      onNameBlurred,
      onEnterKeyPressed,
      onNameDoubleClicked,
      isEditingName,
      dirtyName,
      nameInputRef,
    } = this.props;
    const spanDisplayClass: string = !isEditingName ? 'block' : 'hidden';

    return (
      <Fragment>
        <div className={isEditingName ? 'flex' : 'hidden'}>
          <input
            className="dense border border-white no-ring rect select-text"
            onClick={(e) => e.stopPropagation()}
            ref={nameInputRef}
            type="text"
            value={dirtyName}
            placeholder="Name"
            onChange={onNameChanged}
            onBlur={onNameBlurred}
            onKeyPress={onEnterKeyPressed}
            autoFocus
          />
          <span className="ml-1">{item.type ? '.' + item.type : ''}</span>
        </div>
        <span
          data-test={`${item.isFolder ? 'folder' : 'file'}-name`}
          className={`${spanDisplayClass} cursor-text file-list-item-name-span`}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={onNameDoubleClicked}
        >
          {items.getItemDisplayName(item)}
        </span>
      </Fragment>
    );
  }

  onSelectCheckboxChanged = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { item, dispatch } = this.props;

    e.target.checked ? dispatch(storageActions.selectItems([item])) : dispatch(storageActions.deselectItems([item]));
  };

  render(): ReactNode {
    const {
      item,
      isItemSelected,
      isSomeItemSelected,
      isDraggingThisItem,
      isDraggingOverThisItem,
      connectDragSource,
      connectDropTarget,
      onItemRightClicked,
      onItemClicked,
      onItemDoubleClicked,
      onRenameButtonClicked,
      onInfoButtonClicked,
      onDownloadButtonClicked,
      onShareButtonClicked,
      onDeleteButtonClicked,
    } = this.props;
    const isDraggingClassNames: string = isDraggingThisItem ? 'is-dragging' : '';
    const isDraggingOverClassNames: string = isDraggingOverThisItem ? 'drag-over-effect' : '';
    const selectedClassNames: string = isItemSelected(item) ? 'selected' : '';
    const ItemIconComponent = iconService.getItemIcon(item.isFolder, item.type);

    return connectDragSource(
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
              onChange={this.onSelectCheckboxChanged}
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
        <div className="flex-grow flex items-center w-1">{this.nameNode}</div>

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
      </div>,
    );
  }
}

export default fileExplorerItemComposition(FileListItem);
