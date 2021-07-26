import React from 'react';

import FileListItem from './FileListItem/FileListItem';

import './FileList.scss';
import { RootState } from '../../../store';
import { connect } from 'react-redux';

interface FileListProps {
  items: any[]
}

interface FileListState { }

class FileList extends React.Component<FileListProps, FileListState> {
  constructor(props: FileListProps) {
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

  render(): JSX.Element {
    return (
      <div className="flex-grow bg-white">
        <table className="table-auto w-full">
          <thead className="border-b border-l-neutral-30 bg-white text-neutral-500 py-2 px-3 text-sm">
            <tr>
              <th className="px-4 py-2 w-12 rounded-tl-4px">
                <input type="checkbox" />
              </th>
              <th className="w-12">Type</th>
              <th className="w-48">Name</th>
              <th className="w-64">Modified</th>
              <th className="w-20">Size</th>
              <th className="w-24"></th>
              <th className="w-12 rounded-tr-4px">Actions</th>
            </tr>
          </thead>
          <tbody>
            {this.itemsList}
          </tbody>
        </table>
      </div>
    );
  }
}

export default connect(
  (state: RootState) => ({
    items: state.storage.items,
    selectedItems: state.storage.selectedItems
  }))(FileList);