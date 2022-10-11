import React, { MouseEvent, ReactNode } from 'react';
/*import UilCloudDownload from '@iconscout/react-unicons/icons/uil-cloud-download';
import UilEditAlt from '@iconscout/react-unicons/icons/uil-edit-alt';
import UilShareAlt from '@iconscout/react-unicons/icons/uil-share-alt';
import UilFileInfoAlt from '@iconscout/react-unicons/icons/uil-file-info-alt';
import UilTrashAlt from '@iconscout/react-unicons/icons/uil-trash-alt';
*/
import { PencilSimple, Trash, DownloadSimple, Copy, Gear, LinkBreak, ArrowsOutCardinal, Eye } from 'phosphor-react';
import crypto from 'crypto';

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

  onDeleteButtonClicked = (e: MouseEvent): void => {
    const { onDeleteButtonClicked } = this.props;

    onDeleteButtonClicked && onDeleteButtonClicked(e);
  };

  render(): ReactNode {
    const { title, hiddenActions } = this.props;

    return (
      <div>
        {title ? <span className="mb-1 text-supporting-2">{title}</span> : null}

        {!hiddenActions.includes(DriveItemAction.Share) ? (
          <Dropdown.Item id="share" onClick={this.onShareButtonClicked}>
            <Eye className="mr-1 h-5 w-5 text-blue-60" />
            <span>Open preview</span>
          </Dropdown.Item>
        ) : null}
        {!hiddenActions.includes(DriveItemAction.Share) ? (
          <Dropdown.Item id="share" onClick={this.onShareButtonClicked}>
            <Copy className="mr-1 h-5 w-5 text-blue-60" />
            <span>Copy link</span>
          </Dropdown.Item>
        ) : null}
        {!hiddenActions.includes(DriveItemAction.Share) ? (
          <Dropdown.Item id="share" onClick={this.onShareButtonClicked}>
            <Gear className="mr-1 h-5 w-5 text-blue-60" />
            <span>Share settings</span>
          </Dropdown.Item>
        ) : null}
        {!hiddenActions.includes(DriveItemAction.Share) ? (
          <Dropdown.Item id="share" onClick={this.onShareButtonClicked}>
            <LinkBreak className="mr-1 h-5 w-5 text-blue-60" />
            <span>Delete link</span>
          </Dropdown.Item>
        ) : null}

        <hr className="my-1.5 text-neutral-30"></hr>

        {!hiddenActions.includes(DriveItemAction.Rename) ? (
          <Dropdown.Item id="rename" onClick={this.onRenameButtonClicked}>
            <PencilSimple className="mr-1 h-5 w-5 text-blue-60" />
            <span>Rename</span>
          </Dropdown.Item>
        ) : null}

        {!hiddenActions.includes(DriveItemAction.Info) ? (
          <Dropdown.Item id="info" onClick={this.onInfoButtonClicked}>
            <ArrowsOutCardinal className="mr-1 h-5 w-5 text-blue-60" />
            <span>Move</span>
          </Dropdown.Item>
        ) : null}
        {!hiddenActions.includes(DriveItemAction.Download) ? (
          <Dropdown.Item id="download" onClick={this.onDownloadButtonClicked}>
            <DownloadSimple className="mr-1 h-5 w-5 text-blue-60" />
            <span>Download</span>
          </Dropdown.Item>
        ) : null}
        <hr className="my-1.5 text-neutral-30"></hr>
        {!hiddenActions.includes(DriveItemAction.Delete) ? (
          <Dropdown.Item id="delete" className="text-red-60 hover:text-red-60" onClick={this.onDeleteButtonClicked}>
            <Trash className="mr-1 h-5 w-5" />
            <span>Delete</span>
          </Dropdown.Item>
        ) : null}
      </div>
    );
  }
}

export default FileDropdownActions;
