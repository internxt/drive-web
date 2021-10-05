import React, { MouseEvent, ReactNode } from 'react';
import * as Unicons from '@iconscout/react-unicons';

import Dropdown from 'react-bootstrap/Dropdown';
import { DriveItemAction } from '../../DriveExplorer/DriveExplorerItem';

interface BackupDropdownActionsProps {
  title?: string;
  hiddenActions?: DriveItemAction[];
  onDownloadButtonClicked: (e: MouseEvent) => void;
  onInfoButtonClicked: (e: MouseEvent) => void;
}

class BackupDropdownActions extends React.Component<BackupDropdownActionsProps> {
  constructor(props: BackupDropdownActionsProps) {
    super(props);
  }

  onDownloadButtonClicked = (e: MouseEvent): void => {
    const { onDownloadButtonClicked } = this.props;

    onDownloadButtonClicked && onDownloadButtonClicked(e);
  };

  onInfoButtonClicked = (e: MouseEvent): void => {
    const { onInfoButtonClicked } = this.props;

    onInfoButtonClicked && onInfoButtonClicked(e);
  };

  render(): ReactNode {
    const { title } = this.props;
    const hiddenActions = this.props.hiddenActions || [];

    return (
      <div>
        {title ? <span className="text-supporting-2 mb-1">{title}</span> : null}

        {!hiddenActions.includes(DriveItemAction.Download) ? (
          <Dropdown.Item id="download" onClick={this.onDownloadButtonClicked}>
            <Unicons.UilCloudDownload className="text-blue-60 h-5 mr-1" />
            <span>Download</span>
          </Dropdown.Item>
        ) : null}
        {!hiddenActions.includes(DriveItemAction.Info) ? (
          <Dropdown.Item id="info" onClick={this.onInfoButtonClicked}>
            <Unicons.UilFileInfoAlt className="text-blue-60 h-5 mr-1" />
            <span>Info</span>
          </Dropdown.Item>
        ) : null}
      </div>
    );
  }
}

export default BackupDropdownActions;
