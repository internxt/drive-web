import React from 'react';
import { connect } from 'react-redux';

import iconService, { IconType } from '../../services/icon.service';
import { AppDispatch, RootState } from '../../store';
import { setInfoItem, storageSelectors } from '../../store/slices/storage';

import './FileActivity.scss';

interface FileListProps {
  item: any | undefined;
  dispatch: AppDispatch;
}

interface FileListState { }

class FileActivity extends React.Component<FileListProps, FileListState> {
  constructor(props: FileListProps) {
    super(props);

    this.state = {};

    this.onCloseButtonClicked = this.onCloseButtonClicked.bind(this);
  }

  onCloseButtonClicked(): void {
    this.props.dispatch(setInfoItem(0));
  }

  render(): JSX.Element {
    const item = this.props.item || {};

    return (
      <div className="w-activity-1280 bg-white ml-24px rounded-4px p-24px">

        {/* HEADER */}
        <div className="flex items-center mb-6">
          <img className="file-activity-icon" src={iconService.getIcon(IconType.FolderBlue)} alt="" />
          <div className="flex-grow">
            <span className="block font-semibold text-neutral-700 text-sm">{item.name}</span>
          </div>
          <div className="w-3 cursor-pointer" onClick={this.onCloseButtonClicked}>
            <img className="w-full" src={iconService.getIcon(IconType.CrossBlue)} alt="" />
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
            <img className="w-full" src={iconService.getIcon(IconType.ItemInfo)} alt="" />
          </div>
          <div className="file-activity-info-item">
            <span className="label">Folder path</span>
            <span className="value">Desktop/Backups/FilePending</span>
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
  const item: any | undefined = storageSelectors.getInfoItem(state);

  return {
    item
  };
})(FileActivity);
