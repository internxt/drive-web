import React from 'react';

import './FileActivity.scss';

interface FileActivityProps { }

interface FileActivityState { }

class FileActivity extends React.Component<FileActivityProps, FileActivityState> {
  constructor(props: FileActivityProps) {
    super(props);

    this.state = {};
  }

  componentDidMount() { }

  render() {
    return (
      <div className="w-activity-1280 bg-l-neutral-20 px-32px py-42px">
        <div>

          <div className="text-center">
            <div className="file-icon bg-blue-30 m-auto">
              ICON
            </div>
            <div>
              <span className="text-neutral-900 block font-semibold text-base">Folder info</span>
              <span className="text-neutral-500 block text-supporting-2">Folder name: FilesPending</span>
            </div>
          </div>

          <div className="file-info-container text-left">
            <span className="block text-neutral-500 text-xs">File: PDF</span>
            <span className="block text-neutral-500 text-xs">Folder path: ../FilesPending</span>
            <span className="block text-neutral-500 text-xs">Size: 55.7 MB</span>
            <span className="block text-neutral-500 text-xs">Modified at: 24 Jun 2021</span>
            <span className="block text-neutral-500 text-xs">Created at: 24 Jun 2021</span>
          </div>
        </div>
      </div>
    );
  }
}

export default FileActivity;