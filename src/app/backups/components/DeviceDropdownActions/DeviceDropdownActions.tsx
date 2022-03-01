import React, { MouseEvent, ReactNode } from 'react';
import UilTrashAlt from '@iconscout/react-unicons/icons/uil-trash-alt';
import Dropdown from 'react-bootstrap/Dropdown';
import { DriveItemAction } from '../../../drive/components/DriveExplorer/DriveExplorerItem';

interface DeviceDropdownActionsProps {
  title?: string;
  hiddenActions?: DriveItemAction[];
  onDeleteButtonClicked: (e: MouseEvent) => void;
}

class DeviceDropdownActions extends React.Component<DeviceDropdownActionsProps> {
  constructor(props: DeviceDropdownActionsProps) {
    super(props);
  }

  render(): ReactNode {
    const { title } = this.props;
    const hiddenActions = this.props.hiddenActions || [];

    return (
      <div>
        {title ? <span className="text-supporting-2 mb-1">{title}</span> : null}

        {title && <hr className="text-neutral-30 my-1.5"></hr>}
        {!hiddenActions.includes(DriveItemAction.Delete) ? (
          <Dropdown.Item id="info" onClick={this.props.onDeleteButtonClicked}>
            <UilTrashAlt className="text-red-60 h-5 mr-1" />
            <span className="text-red-60">Delete</span>
          </Dropdown.Item>
        ) : null}
      </div>
    );
  }
}

export default DeviceDropdownActions;
