import React from 'react';

import FileListItem from './FileListItem/FileListItem';

import './FilesList.scss';
import { RootState } from '../../../store';
import { connect } from 'react-redux';

interface FilesListProps {
  items: any[]
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

  onSelectAllButtonClicked() {
    console.log('onSelectAllButtonClicked');
  }

  render(): JSX.Element {
    return (
      <div className="flex-grow bg-white">
        <table className="pointer-events-none table-auto w-full">
          <thead className="border-b border-l-neutral-30 bg-white text-neutral-500 py-2 px-3 text-sm">
            <tr>
              <th className="px-4 py-2 w-12 rounded-tl-4px">
                <input onClick={this.onSelectAllButtonClicked} type="checkbox" />
              </th>
              <th className="w-12">Type</th>
              <th className="w-40">Name</th>
              <th className="w-36"></th>
              <th className="w-64">Modified</th>
              <th className="w-20">Size</th>
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
    items: state.storage.items
  }))(FilesList);