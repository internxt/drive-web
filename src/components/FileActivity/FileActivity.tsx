import React from 'react';
import * as Unicons from '@iconscout/react-unicons';

import iconService from '../../services/icon.service';
import { AppDispatch, RootState } from '../../store';
import { setInfoItem, storageSelectors } from '../../store/slices/storage';

import './FileActivity.scss';
import { connect } from 'react-redux';
import { DriveItemData } from '../../models/interfaces';

interface FileListProps {
  item: DriveItemData | undefined;
  currentFolderPath: string;
  dispatch: AppDispatch;
}

interface FileListState { }

class FileActivity extends React.Component<FileListProps, FileListState> {
  constructor(props: FileListProps) {
    super(props);

    this.state = {};

    this.onCloseButtonClicked = this.onCloseButtonClicked.bind(this);
  }

  get itemFullPath(): string {
    const { currentFolderPath } = this.props;

    return `${currentFolderPath}${this.itemFullName}`;
  }

  get itemFullName(): string {
    const { item } = this.props;
    const itemExtension: string = item?.type ? `.${item?.type}` : '';

    return `${item?.name}${itemExtension}`;
  }

  onCloseButtonClicked(): void {
    this.props.dispatch(setInfoItem(0));
  }

  render(): JSX.Element {
    const item = this.props.item || {};
    const ItemIconComponent = iconService.getItemIcon(item.type);

    return (
      <div className="w-activity-1280 min-w-activity-1280 bg-white ml-24px rounded-4px p-24px">

        {/* HEADER */}
        <div className="flex items-center mb-6">
          <div className="flex items-center min-w-9 w-9 h-9">
            <ItemIconComponent className="h-full" />
          </div>
          <span
            className="mx-2 overflow-hidden whitespace-nowrap overflow-ellipsis block font-semibold text-neutral-700 text-sm w-full max-w-full"
          >{this.itemFullName}</span>
          <div className="w-6 cursor-pointer" onClick={this.onCloseButtonClicked}>
            <Unicons.UilTimes className="text-blue-40" />
          </div>
        </div>

        {/* TABS */}
        <div className="border-b border-l-neutral-50 text-center text-sm mb-4">
          <div className="file-activity-tabs-inner-container">
            <div className="border-b border-blue-60 text-blue-60 w-1/2">
              Info
            </div>
          </div>
        </div>

        {/* INFO TAB CONTENT */}
        <div className="relative border-l border-dashed border-l-neutral-50 pl-4">
          <div className="w-3 absolute bg-white -left-1.5">
            <Unicons.UilFolderNetwork className="w-full" />
          </div>
          <div className="file-activity-info-item">
            <span className="label">Folder path</span>
            <span className="value whitespace-nowrap overflow-ellipsis overflow-hidden">{this.itemFullPath}</span>
          </div>

          {
            !item.isFolder ? <div className="file-activity-info-item">
              <span className="label">Type</span>
              <span className="value">{item.type}</span>
            </div> : null
          }

          <div className="file-activity-info-item">
            <span className="label">Size</span>
            <span className="value">55.7 MB</span>
          </div>
          <div className="file-activity-info-item">
            <span className="label">Modified</span>
            <span className="value">24 Jun 2021</span>
          </div>
          <div className="file-activity-info-item">
            <span className="label">Created</span>
            <span className="value">24 Jun 2021</span>
          </div>
        </div>
      </div>
    );
  }
}

export default connect((state: RootState) => {
  const item: DriveItemData | undefined = storageSelectors.getInfoItem(state);
  const currentFolderPath: string = storageSelectors.currentFolderPath(state);

  return {
    item,
    currentFolderPath
  };
})(FileActivity);
