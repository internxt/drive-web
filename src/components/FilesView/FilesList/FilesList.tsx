import React, { ReactNode } from 'react';

import FileListItem from './FileListItem/FileListItem';

import './FilesList.scss';
import { AppDispatch, RootState } from '../../../store';
import { connect } from 'react-redux';
import { storageActions } from '../../../store/slices/storage';
import { DriveItemData } from '../../../models/interfaces';
import storageSelectors from '../../../store/slices/storage/storageSelectors';

interface FilesListProps {
  items: DriveItemData[];
  isAllSelected: boolean;
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

  onSelectAllButtonClicked = () => {
    const { dispatch, isAllSelected } = this.props;

    isAllSelected ?
      dispatch(storageActions.clearSelectedItems()) :
      dispatch(storageActions.selectAllItems())
    ;
  }

  render(): ReactNode {
    const { isAllSelected } = this.props;

    return (
      <div className="pointer-events-none flex-grow bg-white">
        <table className="pointer-events-none table-auto w-full">
          <thead className="border-b border-l-neutral-30 bg-white text-neutral-500 py-2 px-3 text-base">
            <tr>
              <th className="px-4 py-2 w-12 rounded-tl-4px">
                <input checked={isAllSelected} onClick={this.onSelectAllButtonClicked} type="checkbox" className="pointer-events-auto" />
              </th>
              <th className="w-12">Type</th>
              <th className="w-1/5">Name</th>
              <th className="w-36"></th>
              <th className="w-64">Modified</th>
              <th className="w-20">Size</th>
              <th className="w-12 rounded-tr-4px">Actions</th>
            </tr>
          </thead>
          <tbody className="pointer-events-none">
            {this.itemsList}
          </tbody>
        </table>
      </div>
    );
  }
}

export default connect(
  (state: RootState) => {
    const isAllSelected = storageSelectors.isAllSelected(state);

    return {
      items: state.storage.items,
      isAllSelected
    };
  })(FilesList);