import React, { MouseEvent, ReactNode } from 'react';
import UilCloudDownload from '@iconscout/react-unicons/icons/uil-cloud-download';
import UilFileInfoAlt from '@iconscout/react-unicons/icons/uil-file-info-alt';
import UilTrashAlt from '@iconscout/react-unicons/icons/uil-trash-alt';
import Dropdown from 'react-bootstrap/Dropdown';
import { DriveItemAction } from '../../../drive/components/DriveExplorer/DriveExplorerItem';

interface BackupDropdownActionsProps {
  title?: string;
  hiddenActions?: DriveItemAction[];
  onDownloadButtonClicked: (e: MouseEvent) => void;
  onInfoButtonClicked: (e: MouseEvent) => void;
  onDeleteButtonClicked: (e: MouseEvent) => void;
}

class BackupDropdownActions extends React.Component<BackupDropdownActionsProps> {
  constructor(props: BackupDropdownActionsProps) {
    super(props);
  }

  render(): ReactNode {
    const { title } = this.props;
    const hiddenActions = this.props.hiddenActions || [];

    return (
      <div>
        {title ? <span className="mb-1 text-supporting-2">{title}</span> : null}

        {!hiddenActions.includes(DriveItemAction.Download) ? (
          <Dropdown.Item id="download" onClick={this.props.onDownloadButtonClicked}>
            <UilCloudDownload className="mr-1 h-5 text-primary" />
            <span>Download</span>
          </Dropdown.Item>
        ) : null}
        {!hiddenActions.includes(DriveItemAction.Info) ? (
          <Dropdown.Item id="info" onClick={this.props.onInfoButtonClicked}>
            <UilFileInfoAlt className="mr-1 h-5 text-primary" />
            <span>Info</span>
          </Dropdown.Item>
        ) : null}
        <hr className="my-1.5 text-gray-5"></hr>
        {!hiddenActions.includes(DriveItemAction.Delete) ? (
          <Dropdown.Item id="info" onClick={this.props.onDeleteButtonClicked}>
            <UilTrashAlt className="mr-1 h-5 text-red" />
            <span className="text-red">Delete</span>
          </Dropdown.Item>
        ) : null}
      </div>
    );
  }
}

export default BackupDropdownActions;
