import React, { ReactNode } from 'react';

import FileListItem from './FileListItem/FileListItem';

import './FilesList.scss';
import { AppDispatch, RootState } from '../../../store';
import { connect } from 'react-redux';
import { storageActions } from '../../../store/slices/storage';
import { DriveItemData } from '../../../models/interfaces';

interface FilesListProps {
  items: DriveItemData[];
  selectedItems: DriveItemData[];
  dispatch: AppDispatch;
}

interface FilesListState { }

class FilesList extends React.Component<FilesListProps, FilesListState> {
  constructor(props: FilesListProps) {
    super(props);

    this.state = {};
  }

  get itemsList(): JSX.Element[] {
    return this.props.items.map((item: any, index: number) =>
      <FileListItem
        key={index}
        item={item}
      />);
  }

  get isAllSelected(): boolean {
    const { selectedItems, items } = this.props;
    const files = items.filter(item => !item.isFolder);

    return selectedItems.length === files.length && files.length > 0;
  }

  onSelectAllButtonClicked = () => {
    const { dispatch, items } = this.props;
    const files: DriveItemData[] = items.filter(item => !item.isFolder);

    this.isAllSelected ?
      dispatch(storageActions.clearSelectedItems()) :
      dispatch(storageActions.selectItems(files));
  }

  render(): ReactNode {
    return (
      <div className="pointer-events-none flex-grow bg-white">
        <div className="pointer-events-none w-full">
          <div className="files-list flex border-b border-l-neutral-30 bg-white text-neutral-500 py-2 text-sm">
            <div className="px-4 py-2 w-12 rounded-tl-4px flex items-center justify-center">
              <input readOnly checked={this.isAllSelected} onClick={this.onSelectAllButtonClicked} type="checkbox" className="pointer-events-auto" />
            </div>
            <div className="w-12 column">Type</div>
            <div className="w-1/3 column">Name</div>
            <div className="w-1/6 column"></div>
            <div className="flex-grow column">Modified</div>
            <div className="w-32 column">Size</div>
            <div className="w-16 column rounded-tr-4px">Actions</div>
          </div>
          {this.itemsList}
        </div>
      </div>
    );
  }
}

export default connect(
  (state: RootState) => ({
    selectedItems: state.storage.selectedItems
  }))(FilesList);