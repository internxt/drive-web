import React, { MouseEvent, ReactNode } from 'react';
import UilTrashAlt from '@iconscout/react-unicons/icons/uil-trash-alt';
import Dropdown from 'react-bootstrap/Dropdown';
import { DriveItemAction } from '../../../app/drive/components/DriveExplorer/DriveExplorerItem';

interface DeviceDropdownActionsProps {
  title?: string;
  hiddenActions?: DriveItemAction[];
  onDeleteButtonClicked: (e: MouseEvent) => void;
}

class DeviceDropdownActions extends React.Component<DeviceDropdownActionsProps> {
  render(): ReactNode {
    const { title } = this.props;
    const hiddenActions = this.props.hiddenActions || [];

    return (
      <div>
        {title ? <span className="mb-1 text-supporting-2">{title}</span> : null}

        {title && <hr className="my-1.5 text-gray-5"></hr>}
        {hiddenActions.includes(DriveItemAction.Delete) ? null : (
          <Dropdown.Item id="info" onClick={this.props.onDeleteButtonClicked}>
            <UilTrashAlt className="mr-1 h-5 text-red" />
            <span className="text-red">Delete</span>
          </Dropdown.Item>
        )}
      </div>
    );
  }
}

export default DeviceDropdownActions;
