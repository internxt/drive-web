import React, { MouseEvent, ReactNode } from 'react';
import {
  PencilSimple,
  Trash,
  DownloadSimple,
  Copy,
  Link,
  Gear,
  LinkBreak,
  ClockCounterClockwise,
} from 'phosphor-react';
import Dropdown from 'react-bootstrap/Dropdown';
import { DriveItemAction } from '../DriveExplorer/DriveExplorerItem';
import { get } from 'app/i18n/services/i18n.service';

interface FileDropdownActionsProps {
  title?: string;
  hiddenActions: DriveItemAction[];
  onRenameButtonClicked: (e: MouseEvent) => void;
  onDownloadButtonClicked: (e: MouseEvent) => void;
  onShareButtonClicked: (e: MouseEvent) => void;
  onShareCopyButtonClicked: (e: MouseEvent) => void;
  onShareSettingsButtonClicked: (e: MouseEvent) => void;
  onShareDeleteButtonClicked: (e: MouseEvent) => void;
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

  onShareCopyButtonClicked = (e: MouseEvent): void => {
    const { onShareCopyButtonClicked } = this.props;

    onShareCopyButtonClicked && onShareCopyButtonClicked(e);
  };

  onShareSettingsButtonClicked = (e: MouseEvent): void => {
    const { onShareSettingsButtonClicked } = this.props;

    onShareSettingsButtonClicked && onShareSettingsButtonClicked(e);
  };

  onShareDeleteButtonClicked = (e: MouseEvent): void => {
    const { onShareDeleteButtonClicked } = this.props;

    onShareDeleteButtonClicked && onShareDeleteButtonClicked(e);
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
        {title ? <span className="mb-1 text-supporting-2">{title}</span> : null}

        {/* {!hiddenActions.includes(DriveItemAction.Share) && !this.props.isTrash ? (
          <Dropdown.Item id="share" onClick={this.onShareButtonClicked}>
            <Eye className="mr-1 h-5 w-5 text-blue-60" />
            <span>Open preview</span>
          </Dropdown.Item>
        ) : null} */}
        {!hiddenActions.includes(DriveItemAction.ShareGetLink) && !this.props.isTrash ? (
          <Dropdown.Item id="share" onClick={this.onShareButtonClicked}>
            <Link className="mr-1 h-5 w-5 text-blue-60" />
            <span>{get('drive.dropdown.getLink')}</span>
          </Dropdown.Item>
        ) : null}
        {!hiddenActions.includes(DriveItemAction.ShareCopyLink) && !this.props.isTrash ? (
          <Dropdown.Item id="share" onClick={this.onShareCopyButtonClicked}>
            <Copy className="mr-1 h-5 w-5 text-blue-60" />
            <span>{get('drive.dropdown.copyLink')}</span>
          </Dropdown.Item>
        ) : null}
        {!hiddenActions.includes(DriveItemAction.ShareSettings) && !this.props.isTrash ? (
          <Dropdown.Item id="share" onClick={this.onShareSettingsButtonClicked}>
            <Gear className="mr-1 h-5 w-5 text-blue-60" />
            <span>{get('drive.dropdown.linkSettings')}</span>
          </Dropdown.Item>
        ) : null}
        {!hiddenActions.includes(DriveItemAction.ShareDeleteLink) && !this.props.isTrash ? (
          <Dropdown.Item id="share" onClick={this.onShareDeleteButtonClicked}>
            <LinkBreak className="mr-1 h-5 w-5 text-blue-60" />
            <span>{get('drive.dropdown.deleteLink')}</span>
          </Dropdown.Item>
        ) : null}
        {!hiddenActions.includes(DriveItemAction.Info) && this.props.isTrash ? (
          <Dropdown.Item id="recover" onClick={this.onRecoverButtonClicked}>
            <ClockCounterClockwise className="mr-1 h-5 text-blue-60" />
            <span>{get('drive.dropdown.restore')}</span>
          </Dropdown.Item>
        ) : null}

        {!this.props.isTrash && <hr className="my-1.5 text-neutral-30"></hr>}

        {!hiddenActions.includes(DriveItemAction.Rename) && !this.props.isTrash ? (
          <Dropdown.Item id="rename" onClick={this.onRenameButtonClicked}>
            <PencilSimple className="mr-1 h-5 w-5 text-blue-60" />
            <span>{get('drive.dropdown.rename')}</span>
          </Dropdown.Item>
        ) : null}

        {/* {!hiddenActions.includes(DriveItemAction.Info) ? (
          <Dropdown.Item id="info" onClick={this.onInfoButtonClicked}>
            <ArrowsOutCardinal className="mr-1 h-5 w-5 text-blue-60" />
            <span>Move</span>
          </Dropdown.Item>
        ) : null} */}
        {!hiddenActions.includes(DriveItemAction.Download) && !this.props.isTrash ? (
          <Dropdown.Item id="download" onClick={this.onDownloadButtonClicked}>
            <DownloadSimple className="mr-1 h-5 w-5 text-blue-60" />
            <span>{get('drive.dropdown.download')}</span>
          </Dropdown.Item>
        ) : null}
        <hr className="my-1.5 text-neutral-30"></hr>
        {!hiddenActions.includes(DriveItemAction.Delete) ? (
          <Dropdown.Item
            id="delete"
            className={`${!this.props.isTrash ? 'text-red-60 hover:text-red-60' : ''}`}
            onClick={!this.props.isTrash ? this.onDeleteButtonClicked : this.onDeletePermanentlyButtonClicked}
          >
            <Trash className={`mr-1 h-5 w-5 ${this.props.isTrash ? 'text-blue-60' : ''}`} />
            <span>
              {this.props.isTrash ? get('drive.dropdown.deletePermanently') : get('drive.dropdown.moveToTrash')}
            </span>
          </Dropdown.Item>
        ) : null}
      </div>
    );
  }
}

export default FileDropdownActions;
