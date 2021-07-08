import React from 'react';

import './FileActivity.scss';

interface FileActivityProps {}

interface FileActivityState { }

class FileActivity extends React.Component<FileActivityProps, FileActivityState> {
  constructor(props: FileActivityProps) {
    super(props);

    this.state = { };
  }

  componentDidMount() { }

  render() {
    return (
      <div className="w-activity-1280 bg-l-neutral-20 px-32px py-42px">
        FILE ACTIVITY
      </div>
    );
  }
}

export default FileActivity;