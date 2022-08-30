import React, { MouseEvent, ReactNode } from 'react';
//import UilCloudDownload from '@iconscout/react-unicons/icons/uil-cloud-download';
//import UilEditAlt from '@iconscout/react-unicons/icons/uil-edit-alt';
//import UilShareAlt from '@iconscout/react-unicons/icons/uil-share-alt';
//import UilFileInfoAlt from '@iconscout/react-unicons/icons/uil-file-info-alt';
import {ClockCounterClockwise, Link, Info, CloudArrowDown, Trash, PencilSimple} from 'phosphor-react';
//import UilTrashAlt from '@iconscout/react-unicons/icons/uil-trash-alt';

import Dropdown from 'react-bootstrap/Dropdown';
import { DriveItemAction } from '../DriveExplorer/DriveExplorerItem';

interface FileDropdownActionsProps {
  title?: string;
  hiddenActions: DriveItemAction[];
  onRenameButtonClicked: (e: MouseEvent) => void;
  onDownloadButtonClicked: (e: MouseEvent) => void;
  onShareButtonClicked: (e: MouseEvent) => void;
  onInfoButtonClicked: (e: MouseEvent) => void;
  onDeleteButtonClicked: (e: MouseEvent) => void;
  onRecoverButtonClicked?: (e: MouseEvent) => void;
  onDeletePermanentlyButtonClicked: (e: MouseEvent) => void;
  isTrash?: boolean;
}

class FileDropdownActions extends React.Component<FileDropdownActionsProps> {
  constructor(props: FileDropdownActionsProps) {
    super(props);
  }

  onDownloadButtonClicked = (e: MouseEvent): void => {
    const { onDownloadButtonClicked } = this.props;

    onDownloadButtonClicked && onDownloadButtonClicked(e);
  };

  onRenameButtonClicked = (e: MouseEvent): void => {
    const { onRenameButtonClicked } = this.props;

    onRenameButtonClicked && onRenameButtonClicked(e);
  };

  onShareButtonClicked = (e: MouseEvent): void => {
    const { onShareButtonClicked } = this.props;

    onShareButtonClicked && onShareButtonClicked(e);
  };

  onInfoButtonClicked = (e: MouseEvent): void => {
    const { onInfoButtonClicked } = this.props;

    onInfoButtonClicked && onInfoButtonClicked(e);
  };

  onRecoverButtonClicked = (e: MouseEvent): void => {
    const { onRecoverButtonClicked } = this.props;

    onRecoverButtonClicked && onRecoverButtonClicked(e);
  };

  onDeleteButtonClicked = (e: MouseEvent): void => {
    const { onDeleteButtonClicked } = this.props;

    onDeleteButtonClicked && onDeleteButtonClicked(e);
  };

  onDeletePermanentlyButtonClicked = (e: MouseEvent): void => {
    const { onDeletePermanentlyButtonClicked } = this.props;

    onDeletePermanentlyButtonClicked && onDeletePermanentlyButtonClicked(e);
  };

  render(): ReactNode {
    const { title, hiddenActions } = this.props;

    return (
      <div>
        {title ? <span className="text-supporting-2 mb-1">{title}</span> : null}

        {!hiddenActions.includes(DriveItemAction.Download) && !this.props.isTrash? (
          <Dropdown.Item id="download" onClick={this.onDownloadButtonClicked}>
            <CloudArrowDown className="text-blue-60 h-5 mr-1" />
            <span>Download</span>
          </Dropdown.Item>
        ) : null}
        {!hiddenActions.includes(DriveItemAction.Rename) && !this.props.isTrash? (
          <Dropdown.Item id="rename" onClick={this.onRenameButtonClicked}>
            <PencilSimple className="text-blue-60 h-5 mr-1" />
            <span>Rename</span>
          </Dropdown.Item>
        ) : null}
        {!hiddenActions.includes(DriveItemAction.Share) && !this.props.isTrash ? (
          <Dropdown.Item id="share" onClick={this.onShareButtonClicked}>
            <Link className="text-blue-60 h-5 mr-1" />
            <span>Share</span>
          </Dropdown.Item>
        ) : null}
        {!hiddenActions.includes(DriveItemAction.Info) && !this.props.isTrash ? (
          <Dropdown.Item id="info" onClick={this.onInfoButtonClicked}>
            <Info className="text-blue-60 h-5 mr-1" />
            <span>Info</span>
          </Dropdown.Item>
        ) : null}
        {!hiddenActions.includes(DriveItemAction.Info) && this.props.isTrash ? (
          <Dropdown.Item id="recover" onClick={this.onRecoverButtonClicked}>
            <ClockCounterClockwise className="text-blue-60 h-5 mr-1" />
            <span>Restore</span>
          </Dropdown.Item>
        ) : null}
        <hr className="text-neutral-30 my-1.5"></hr>
        {!hiddenActions.includes(DriveItemAction.Delete) ? (
          <Dropdown.Item id="delete" className={`${!this.props.isTrash?'text-red-60 hover:text-red-60':''}`} onClick={!this.props.isTrash? this.onDeleteButtonClicked : this.onDeletePermanentlyButtonClicked}>
            <Trash className={`h-5 mr-1 ${this.props.isTrash?'text-blue-60':''}`} />
            <span>{this.props.isTrash? 'Delete permanently' : 'Delete'}</span>
          </Dropdown.Item>
        ) : null}
      </div>
    );
  }
}

export default FileDropdownActions;
