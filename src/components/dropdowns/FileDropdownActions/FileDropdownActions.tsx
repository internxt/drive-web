import React, { ReactNode } from 'react';
import * as Unicons from '@iconscout/react-unicons';

import Dropdown from 'react-bootstrap/Dropdown';
import { ItemAction } from '../../../models/enums';

interface FileDropdownActionsProps {
  title?: string;
  hiddenActions: ItemAction[];
  onRenameButtonClicked: () => void;
  onDownloadButtonClicked: () => void;
  onShareButtonClicked: () => void;
  onInfoButtonClicked: () => void;
  onDeleteButtonClicked: () => void;
}

interface FileDropdownActionsState { }

class FileDropdownActions extends React.Component<FileDropdownActionsProps, FileDropdownActionsState> {
  constructor(props: FileDropdownActionsProps) {
    super(props);

    this.state = {};
  }

  onDownloadButtonClicked = (): void => {
    const { onDownloadButtonClicked } = this.props;

    onDownloadButtonClicked && onDownloadButtonClicked();
  }

  onRenameButtonClicked = (): void => {
    const { onRenameButtonClicked } = this.props;

    onRenameButtonClicked && onRenameButtonClicked();
  }

  onShareButtonClicked = (): void => {
    const { onShareButtonClicked } = this.props;

    onShareButtonClicked && onShareButtonClicked();
  }

  onInfoButtonClicked = (): void => {
    const { onInfoButtonClicked } = this.props;

    onInfoButtonClicked && onInfoButtonClicked();
  }

  onDeleteButtonClicked = (): void => {
    const { onDeleteButtonClicked } = this.props;

    onDeleteButtonClicked && onDeleteButtonClicked();
  }

  render(): ReactNode {
    const { title, hiddenActions } = this.props;

    return (
      <div>
        { title ?
          <span className="text-supporting-2 mb-1">{title}</span> :
          null
        }

        { !hiddenActions.includes(ItemAction.Download) ?
          <Dropdown.Item
            id="download"
            onClick={this.onDownloadButtonClicked}
          >
            <Unicons.UilCloudDownload className="text-blue-60 h-5 mr-1" />
            <span>Download</span>
          </Dropdown.Item> : null
        }
        { !hiddenActions.includes(ItemAction.Rename) ?
          <Dropdown.Item
            id="rename"
            onClick={this.onRenameButtonClicked}
          >
            <Unicons.UilEditAlt className="text-blue-60 h-5 mr-1" />
            <span>Rename</span>
          </Dropdown.Item> : null
        }
        { !hiddenActions.includes(ItemAction.Share) ?
          <Dropdown.Item
            id="share"
            onClick={this.onShareButtonClicked}
          >
            <Unicons.UilShareAlt className="text-blue-60 h-5 mr-1" />
            <span>Share</span>
          </Dropdown.Item> : null
        }
        { !hiddenActions.includes(ItemAction.Info) ?
          <Dropdown.Item
            id="info"
            onClick={this.onInfoButtonClicked}
          >
            <Unicons.UilFileInfoAlt className="text-blue-60 h-5 mr-1" />
            <span>Info</span>
          </Dropdown.Item> : null
        }
        <hr className="text-l-neutral-30 my-1.5"></hr>
        { !hiddenActions.includes(ItemAction.Delete) ?
          <Dropdown.Item
            id="delete"
            className="text-red-60 hover:text-red-60"
            onClick={this.onDeleteButtonClicked}
          >
            <Unicons.UilTrashAlt className="h-5 mr-1" />
            <span>Delete</span>
          </Dropdown.Item> : null
        }
      </div>
    );
  }
}

export default FileDropdownActions;