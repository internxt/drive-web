import React from 'react';

import FileListItem from './FileListItem/FileListItem';

import './FileList.scss';

interface FileActivityProps { }

interface FileActivityState { }

class FileActivity extends React.Component<FileActivityProps, FileActivityState> {
  constructor(props: FileActivityProps) {
    super(props);

    this.state = {};
  }

  render() {
    return (
      <div>
        <table className="table-auto w-full">
          <thead className="bg-l-neutral-20 text-neutral-500 py-2 px-3 text-sm">
            <tr>
              <th className="px-4 py-2 w-12">
                <input type="checkbox" />
              </th>
              <th className="w-12">Type</th>
              <th className="w-64">Name</th>
              <th className="w-64">Modified</th>
              <th className="w-12">Size</th>
              <th className="w-24"></th>
              <th className="w-12">Actions</th>
            </tr>
          </thead>
          <tbody>
            <FileListItem />
            <FileListItem />
            <FileListItem />
          </tbody>
        </table>
      </div>
    );
  }
}

export default FileActivity;