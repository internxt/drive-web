import React, { Fragment, ReactNode } from 'react';
import { connect } from 'react-redux';

import FileList from './FileList/FileList';
import FileGrid from './FileGrid/FileGrid';
import Breadcrumbs, { BreadcrumbItemData } from '../Breadcrumbs/Breadcrumbs';
import LoadingFileExplorer from '../LoadingFileExplorer/LoadingFileExplorer';

import { FileViewMode } from './models/enums';
import { AppDispatch, RootState } from '../../store';

import './FileView.scss';
import iconService, { IconType } from '../../services/icon.service';
import folderService, { ICreatedFolder } from '../../services/folder.service';
import { UserSettings } from '../../models/interfaces';
import { setIsCreateFolderDialogOpen } from '../../store/slices/uiSlice';
import FileActivity from '../FileActivity/FileActivity';

interface FileViewProps {
  user: UserSettings;
  currentFolderId: number | null;
  infoItemId: number;
  isLoadingItems: boolean;
  selectedItems: number[];
  dispatch: AppDispatch;
}

interface FileViewState {
  viewMode: FileViewMode;
}

class FileView extends React.Component<FileViewProps, FileViewState> {
  constructor(props: FileViewProps) {
    super(props);

    this.state = {
      viewMode: FileViewMode.List
    };

    this.onViewModeButtonClicked = this.onViewModeButtonClicked.bind(this);
    this.onCreateFolderButtonClicked = this.onCreateFolderButtonClicked.bind(this);
    this.onBulkDownloadButtonClicked = this.onBulkDownloadButtonClicked.bind(this);
    this.onBulkDeleteButtonClicked = this.onBulkDeleteButtonClicked.bind(this);
  }

  get breadcrumbItems(): BreadcrumbItemData[] {
    const items: BreadcrumbItemData[] = [];

    items.push({
      name: 'storage',
      label: 'Storage',
      icon: iconService.getIcon(IconType.BreadcrumbsStorage),
      active: true
    });
    items.push({
      name: 'folder-parent-name',
      label: 'FolderParentName',
      icon: iconService.getIcon(IconType.BreadcrumbsFolder),
      active: false
    });

    return items;
  }

  get hasAnyItemSelected(): boolean {
    return this.props.selectedItems.length > 0;
  }

  onCreateFolderConfirmed(folderName: string): Promise<ICreatedFolder[]> {
    const { user, currentFolderId } = this.props;

    return folderService.createFolder(!!user.teams, currentFolderId, folderName);
  }

  onViewModeButtonClicked(): void {
    const viewMode: FileViewMode = this.state.viewMode === FileViewMode.List ?
      FileViewMode.Grid :
      FileViewMode.List;

    this.setState({ viewMode });
  }

  onCreateFolderButtonClicked() {
    this.props.dispatch(setIsCreateFolderDialogOpen(true));
  }

  onBulkDownloadButtonClicked() {
    console.log('on bulk download button clicked');
  }

  onBulkDeleteButtonClicked() {
    console.log('on bulk delete button clicked!');
  }

  onPreviousPageButtonClicked(): void {
    console.log('previous page button clicked!');
  }

  onNextPageButtonClicked(): void {
    console.log('next page button clicked!');
  }

  render(): ReactNode {
    const { isLoadingItems, infoItemId } = this.props;
    const { viewMode } = this.state;
    const viewModesIcons = {
      [FileViewMode.List]: iconService.getIcon(IconType.MosaicView),
      [FileViewMode.Grid]: iconService.getIcon(IconType.ListView)
    };
    const viewModes = {
      [FileViewMode.List]: <FileList />,
      [FileViewMode.Grid]: <FileGrid />
    };

    return (
      <Fragment>
        <div className="flex flex-grow">
          <div className="flex-grow flex flex-col">
            <div className="flex justify-between pb-4">
              <div>
                <span className="text-base font-semibold"> Drive </span>
                <Breadcrumbs items={this.breadcrumbItems} />
              </div>

              <div className="flex">
                <button className="primary mr-1 flex items-center">
                  <img className="h-3 mr-2" src={iconService.getIcon(IconType.Upload)} /><span>Upload</span>
                </button>
                {!this.hasAnyItemSelected ? <button className="secondary mr-1" onClick={this.onCreateFolderButtonClicked}>
                  <img src={iconService.getIcon(IconType.CreateFolder)} />
                </button> : null}
                {this.hasAnyItemSelected ? <button className="secondary mr-1" onClick={this.onBulkDownloadButtonClicked}>
                  <img src={iconService.getIcon(IconType.DownloadItems)} />
                </button> : null}
                {this.hasAnyItemSelected ? <button className="secondary mr-1" onClick={this.onBulkDeleteButtonClicked}>
                  <img src={iconService.getIcon(IconType.DeleteItems)} />
                </button> : null}
                <button className="secondary" onClick={this.onViewModeButtonClicked}>
                  <img src={viewModesIcons[viewMode]} />
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-between flex-grow">
              {isLoadingItems ?
                <LoadingFileExplorer /> :
                viewModes[viewMode]
              }
              {!isLoadingItems && (
                <div className="bg-white px-3 h-12 flex justify-center items-center rounded-b-4px">
                  <div className="flex justify-center">
                    <div onClick={this.onPreviousPageButtonClicked} className="pagination-button">
                      <img alt="" src={iconService.getIcon(IconType.PreviousPage)} />
                    </div>
                    <div className="pagination-button">
                      1
                    </div>
                    <div onClick={this.onNextPageButtonClicked} className="pagination-button">
                      <img alt="" src={iconService.getIcon(IconType.NextPage)} />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {
            infoItemId ? <FileActivity /> : null
          }
        </div>
      </Fragment>
    );
  }
}

export default connect((state: RootState) => ({
  user: state.user.user,
  currentFolderId: state.storage.currentFolderId,
  infoItemId: state.storage.infoItemId,
  isLoadingItems: state.storage.isLoading,
  selectedItems: state.storage.selectedItems
}))(FileView);