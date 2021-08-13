import React, { Fragment, ReactNode } from 'react';
import { DropTarget } from 'react-dnd';
import { connect } from 'react-redux';
import { Dropdown } from 'react-bootstrap';
import * as Unicons from '@iconscout/react-unicons';

import FileDropdownActions from '../../../dropdowns/FileDropdownActions/FileDropdownActions';
import sizeService from '../../../../services/size.service';

import './FileListItem.scss';
import dateService from '../../../../services/date.service';
import { RootState } from '../../../../store';
import { storageActions, storageSelectors } from '../../../../store/slices/storage';
import iconService from '../../../../services/icon.service';
import { ItemAction } from '../../../../models/enums';
import { getItemFullName } from '../../../../services/storage.service/storage-name.service';
import fileExplorerItemWrapper, { dropTargetCollect, dropTargetSpec, FileExplorerItemViewProps } from '../fileExplorerItemWrapper';

class FileListItem extends React.Component<FileExplorerItemViewProps, {}> {
  get nameNode(): JSX.Element {
    const {
      item,
      onNameChanged,
      onNameBlurred,
      onEnterKeyPressed,
      onNameDoubleClicked,
      isEditingName,
      dirtyName,
      nameInputRef
    } = this.props;
    const spanDisplayClass: string = !isEditingName ? 'block' : 'hidden';

    return (
      <Fragment>
        <div className={isEditingName ? 'flex' : 'hidden'}>
          <input
            className="dense border border-white no-ring rect"
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
          <span className="ml-1">{item.type ? ('.' + item.type) : ''}</span>
        </div>
        <span
          className={`${spanDisplayClass} file-list-item-name-span`}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={onNameDoubleClicked}
        >{getItemFullName(item.name, item.type)}</span>
      </Fragment>
    );
  }

  onSelectCheckboxChanged = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { item, dispatch } = this.props;

    e.target.checked ?
      dispatch(storageActions.selectItems([item])) :
      dispatch(storageActions.deselectItems([item]));
  }

  render(): ReactNode {
    const {
      item,
      isItemSelected,
      isSomeItemSelected,
      isDraggingOverThisItem,
      connectDropTarget,
      onItemRightClicked,
      onItemClicked,
      onItemDoubleClicked,
      onRenameButtonClicked,
      onInfoButtonClicked,
      onDownloadButtonClicked,
      onShareButtonClicked,
      onDeleteButtonClicked
    } = this.props;
    const selectedClassNames: string = isItemSelected(item) ? 'selected' : '';
    const ItemIconComponent = iconService.getItemIcon(item.isFolder, item.type);

    return connectDropTarget(
      <div
        className={`${selectedClassNames} ${isDraggingOverThisItem ? 'drag-over-effect' : ''} group file-list-item`}
        draggable={false}
        onContextMenu={onItemRightClicked}
        onClick={onItemClicked}
        onDoubleClick={onItemDoubleClicked}
      >

        {/* SELECTION */}
        <div className="w-0.5/12 px-3 flex items-center justify-center box-content">
          {!item.isFolder ?
            <input
              onClick={(e) => e.stopPropagation()}
              type="checkbox"
              checked={isItemSelected(item)}
              onChange={this.onSelectCheckboxChanged}
            /> :
            null
          }
        </div>

        {/* ICON */}
        <div className="w-0.5/12 flex items-center px-3 box-content">
          <div className="h-8 w-8 flex justify-center">
            <ItemIconComponent className="h-full" />
          </div>
        </div>

        {/* NAME */}
        <div className="flex-grow flex items-center w-1">
          {this.nameNode}
        </div>

        {/* HOVER ACTIONS */}
        <div className="pl-3 w-2/12 items-center hidden xl:flex">
          <div className={`${isSomeItemSelected ? 'invisible' : ''} flex`}>
            {!item.isFolder ?
              <button onClick={onDownloadButtonClicked} className="hover-action mr-4">
                <Unicons.UilCloudDownload className="h-5" />
              </button> : null
            }
            {!item.isFolder ?
              <button onClick={onShareButtonClicked} className="hover-action mr-4">
                <Unicons.UilShareAlt className="h-5" />
              </button> : null
            }
            <button onClick={onDeleteButtonClicked} className="hover-action">
              <Unicons.UilTrashAlt className="h-5" />
            </button>
          </div>
        </div>

        {/* DATE */}
        <div className="hidden lg:flex items-center w-3/12 whitespace-nowrap overflow-ellipsis">{dateService.format(item.updatedAt, 'DD MMMM YYYY. HH:mm')}</div>

        {/* SIZE */}
        <div className="flex items-center w-2/12 whitespace-nowrap overflow-ellipsis">{sizeService.bytesToString(item.size, false).toUpperCase()}</div>

        {/* ACTIONS BUTTON */}
        <div className="flex items-center w-1/12">
          <Dropdown>
            <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-list-item-actions-button text-blue-60 bg-l-neutral-20 font-bold">
              <Unicons.UilEllipsisH className="w-full h-full" />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <FileDropdownActions
                hiddenActions={item.isFolder ? [ItemAction.Download, ItemAction.Share] : []}
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
  }
}

export default connect(
  (state: RootState) => {
    const isItemSelected = storageSelectors.isItemSelected(state);
    const isSomeItemSelected = storageSelectors.isSomeItemSelected(state);
    const currentFolderId = storageSelectors.currentFolderId(state);

    return {
      isSomeItemSelected,
      selectedItems: state.storage.selectedItems,
      namePath: state.storage.namePath,
      currentFolderId,
      isItemSelected,
      workspace: state.team.workspace,
      isDriveItemInfoMenuOpen: state.ui.isDriveItemInfoMenuOpen
    };
  })(fileExplorerItemWrapper(DropTarget((props) => props.dropTargetTypes, dropTargetSpec, dropTargetCollect)(FileListItem)));