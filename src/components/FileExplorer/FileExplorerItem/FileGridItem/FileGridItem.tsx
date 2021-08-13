import React, { Fragment, ReactNode } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import * as Unicons from '@iconscout/react-unicons';

import FileDropdownActions from '../../../dropdowns/FileDropdownActions/FileDropdownActions';
import { storageSelectors } from '../../../../store/slices/storage';

import { RootState } from '../../../../store';
import { connect } from 'react-redux';

import './FileGridItem.scss';
import { ItemAction } from '../../../../models/enums';

import './FileGridItem.scss';
import iconService from '../../../../services/icon.service';
import { getItemFullName } from '../../../../services/storage.service/storage-name.service';
import { DropTarget } from 'react-dnd';
import fileExplorerItemWrapper, { dropTargetCollect, dropTargetSpec, FileExplorerItemViewProps, getDropTargetType } from '../fileExplorerItemWrapper';

interface FileGridItemState {
  itemRef: React.RefObject<HTMLDivElement>;
}

class FileGridItem extends React.Component<FileExplorerItemViewProps, FileGridItemState> {
  constructor(props: FileExplorerItemViewProps) {
    super(props);

    this.state = {
      itemRef: React.createRef()
    };
  }

  componentDidMount() {
    this.updateHeight();

    window.addEventListener('resize', this.updateHeight);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateHeight);
  }

  updateHeight = () => {
    this.forceUpdate();
  }

  get nameNode(): JSX.Element {
    const { item, onNameChanged, onNameBlurred, onNameDoubleClicked, onEnterKeyPressed, isEditingName, dirtyName, nameInputRef } = this.props;
    const ṣpanDisplayClass: string = !isEditingName ? 'block' : 'hidden';

    return (
      <Fragment>
        <div className={isEditingName ? 'flex' : 'hidden'}>
          <input
            className="w-full dense border border-white no-ring rect"
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
          className={`${ṣpanDisplayClass} cursor-text file-grid-item-name-span`}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={onNameDoubleClicked}
        >{getItemFullName(item.name, item.type)}</span>
      </Fragment>
    );
  }

  render(): ReactNode {
    const { itemRef } = this.state;
    const {
      item,
      isItemSelected,
      connectDropTarget,
      isDraggingOverThisItem,
      onRenameButtonClicked,
      onDownloadButtonClicked,
      onDeleteButtonClicked,
      onInfoButtonClicked,
      onShareButtonClicked,
      onItemRightClicked,
      onItemClicked,
      onItemDoubleClicked
    } = this.props;
    const selectedClassNames: string = isItemSelected(item) ? 'selected' : '';
    const ItemIconComponent = iconService.getItemIcon(item.isFolder, item.type);
    const height = this.state.itemRef.current ?
      this.state.itemRef.current?.clientWidth + 'px' :
      'auto';

    return connectDropTarget(
      <div
        ref={itemRef}
        style={{ height }}
        className={`${selectedClassNames} ${isDraggingOverThisItem ? 'drag-over-effect' : ''} group file-grid-item`}
        onContextMenu={onItemRightClicked}
        onClick={onItemClicked}
        onDoubleClick={onItemDoubleClicked}
        draggable={false}
      >
        <Dropdown>
          <Dropdown.Toggle variant="success" id="dropdown-basic" className="file-grid-item-actions-button">
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
        <div className="file-grid-item-icon-container">
          <ItemIconComponent className="file-icon m-auto" />
        </div>
        <div className="text-center mt-3">
          <div className="mb-1">
            {this.nameNode}
          </div>
        </div>
      </div>
    );
  }
}

export default connect(
  (state: RootState) => {
    const isSomeItemSelected = storageSelectors.isSomeItemSelected(state);
    const isItemSelected = storageSelectors.isItemSelected(state);
    const currentFolderId = storageSelectors.currentFolderId(state);

    return {
      isSomeItemSelected,
      selectedItems: state.storage.selectedItems,
      namePath: state.storage.namePath,
      currentFolderId,
      isItemSelected,
      workspace: state.team.workspace,
      isSidenavCollapsed: state.ui.isSidenavCollapsed,
      isDriveItemInfoMenuOpen: state.ui.isDriveItemInfoMenuOpen
    };
  })(fileExplorerItemWrapper(DropTarget(getDropTargetType, dropTargetSpec, dropTargetCollect)(FileGridItem)));