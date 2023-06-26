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
} from '@phosphor-icons/react';
import Dropdown from 'react-bootstrap/Dropdown';
import { DriveItemAction } from '../DriveExplorer/DriveExplorerItem';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

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

const FileDropdownActions = (props: FileDropdownActionsProps) => {
  const { translate } = useTranslationContext();
  const onDownloadButtonClicked = (e: MouseEvent): void => {
    const { onDownloadButtonClicked } = props;

    onDownloadButtonClicked && onDownloadButtonClicked(e);
  };

  const onRenameButtonClicked = (e: MouseEvent): void => {
    const { onRenameButtonClicked } = props;

    onRenameButtonClicked && onRenameButtonClicked(e);
  };

  const onShareButtonClicked = (e: MouseEvent): void => {
    const { onShareButtonClicked } = props;

    onShareButtonClicked && onShareButtonClicked(e);
  };

  const onShareCopyButtonClicked = (e: MouseEvent): void => {
    const { onShareCopyButtonClicked } = props;

    onShareCopyButtonClicked && onShareCopyButtonClicked(e);
  };

  const onShareSettingsButtonClicked = (e: MouseEvent): void => {
    const { onShareSettingsButtonClicked } = props;

    onShareSettingsButtonClicked && onShareSettingsButtonClicked(e);
  };

  const onShareDeleteButtonClicked = (e: MouseEvent): void => {
    const { onShareDeleteButtonClicked } = props;

    onShareDeleteButtonClicked && onShareDeleteButtonClicked(e);
  };

  const onInfoButtonClicked = (e: MouseEvent): void => {
    const { onInfoButtonClicked } = props;

    onInfoButtonClicked && onInfoButtonClicked(e);
  };

  const onRecoverButtonClicked = (e: MouseEvent): void => {
    const { onRecoverButtonClicked } = props;

    onRecoverButtonClicked && onRecoverButtonClicked(e);
  };

  const onDeleteButtonClicked = (e: MouseEvent): void => {
    const { onDeleteButtonClicked } = props;

    onDeleteButtonClicked && onDeleteButtonClicked(e);
  };

  const onDeletePermanentlyButtonClicked = (e: MouseEvent): void => {
    const { onDeletePermanentlyButtonClicked } = props;

    onDeletePermanentlyButtonClicked && onDeletePermanentlyButtonClicked(e);
  };

  const { title, hiddenActions } = props;

  return (
    <div>
      {title ? <span className="mb-1 text-supporting-2">{title}</span> : null}

      {/* {!hiddenActions.includes(DriveItemAction.Share) && !props.isTrash ? (
          <Dropdown.Item id="share" onClick={onShareButtonClicked}>
            <Eye className="mr-1 h-5 w-5 text-blue-60" />
            <span>Open preview</span>
          </Dropdown.Item>
        ) : null} */}
      {!hiddenActions.includes(DriveItemAction.ShareGetLink) && !props.isTrash ? (
        <Dropdown.Item id="share" onClick={onShareButtonClicked}>
          <Link className="mr-1 h-5 w-5 text-blue-60" />
          <span>{translate('drive.dropdown.getLink')}</span>
        </Dropdown.Item>
      ) : null}
      {!hiddenActions.includes(DriveItemAction.ShareCopyLink) && !props.isTrash ? (
        <Dropdown.Item id="share" onClick={onShareCopyButtonClicked}>
          <Copy className="mr-1 h-5 w-5 text-blue-60" />
          <span>{translate('drive.dropdown.copyLink')}</span>
        </Dropdown.Item>
      ) : null}
      {!hiddenActions.includes(DriveItemAction.ShareSettings) && !props.isTrash ? (
        <Dropdown.Item id="share" onClick={onShareSettingsButtonClicked}>
          <Gear className="mr-1 h-5 w-5 text-blue-60" />
          <span>{translate('drive.dropdown.linkSettings')}</span>
        </Dropdown.Item>
      ) : null}
      {!hiddenActions.includes(DriveItemAction.ShareDeleteLink) && !props.isTrash ? (
        <Dropdown.Item id="share" onClick={onShareDeleteButtonClicked}>
          <LinkBreak className="mr-1 h-5 w-5 text-blue-60" />
          <span>{translate('drive.dropdown.deleteLink')}</span>
        </Dropdown.Item>
      ) : null}
      {!hiddenActions.includes(DriveItemAction.Info) && props.isTrash ? (
        <Dropdown.Item id="recover" onClick={onRecoverButtonClicked}>
          <ClockCounterClockwise className="mr-1 h-5 text-blue-60" />
          <span>{translate('drive.dropdown.restore')}</span>
        </Dropdown.Item>
      ) : null}

      {!props.isTrash && <hr className="my-1.5 text-neutral-30"></hr>}

      {!hiddenActions.includes(DriveItemAction.Rename) && !props.isTrash ? (
        <Dropdown.Item id="rename" onClick={onRenameButtonClicked}>
          <PencilSimple className="mr-1 h-5 w-5 text-blue-60" />
          <span>{translate('drive.dropdown.rename')}</span>
        </Dropdown.Item>
      ) : null}

      {/* {!hiddenActions.includes(DriveItemAction.Info) ? (
          <Dropdown.Item id="info" onClick={onInfoButtonClicked}>
            <ArrowsOutCardinal className="mr-1 h-5 w-5 text-blue-60" />
            <span>Move</span>
          </Dropdown.Item>
        ) : null} */}
      {!hiddenActions.includes(DriveItemAction.Download) && !props.isTrash ? (
        <Dropdown.Item id="download" onClick={onDownloadButtonClicked}>
          <DownloadSimple className="mr-1 h-5 w-5 text-blue-60" />
          <span>{translate('drive.dropdown.download')}</span>
        </Dropdown.Item>
      ) : null}
      <hr className="my-1.5 text-neutral-30"></hr>
      {!hiddenActions.includes(DriveItemAction.Delete) ? (
        <Dropdown.Item
          id="delete"
          className={`${!props.isTrash ? 'text-red-60 hover:text-red-60' : ''}`}
          onClick={!props.isTrash ? onDeleteButtonClicked : onDeletePermanentlyButtonClicked}
        >
          <Trash className={`mr-1 h-5 w-5 ${props.isTrash ? 'text-blue-60' : ''}`} />
          <span>
            {props.isTrash ? translate('drive.dropdown.deletePermanently') : translate('drive.dropdown.moveToTrash')}
          </span>
        </Dropdown.Item>
      ) : null}
    </div>
  );
};

export default FileDropdownActions;
