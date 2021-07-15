import React, { ReactNode } from 'react';
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

interface FileViewProps {
  user: UserSettings;
  currentFolderId: number | null;
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
    const { isLoadingItems } = this.props;
    const { viewMode } = this.state;
    const viewModesIcons = {
      [FileViewMode.List]: iconService.getIcon(IconType.ListView),
      [FileViewMode.Grid]: iconService.getIcon(IconType.MosaicView)
    };
    const viewModes = {
      [FileViewMode.List]: <FileList />,
      [FileViewMode.Grid]: <FileGrid />
    };

    return (
      <div>
        <div className="flex justify-between items-center pt-2 pb-4">
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

        { isLoadingItems ?
          <LoadingFileExplorer /> :
          viewModes[viewMode]
        }

        { !isLoadingItems && (
          <div className="flex justify-center mt-16">
            <div onClick={this.onPreviousPageButtonClicked} className="pagination-button">
              {'<<'}
            </div>
            <div className="pagination-button">
              1
            </div>
            <div onClick={this.onNextPageButtonClicked} className="pagination-button">
              {'>>'}
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default connect((state: RootState) => ({
  user: state.user.user,
  currentFolderId: state.storage.currentFolderId,
  isLoadingItems: state.storage.isLoading,
  selectedItems: state.storage.selectedItems
}))(FileView);