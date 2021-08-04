import { Component, ReactNode } from 'react';
import { connect } from 'react-redux';

import FileExplorer from '../../components/FileExplorer/FileExplorer';
import { AppFileExplorerConfig, DriveItemData } from '../../models/interfaces';
import configService from '../../services/config.service';
import { AppDispatch, RootState } from '../../store';
import { storageSelectors, storageThunks } from '../../store/slices/storage';
import history from '../../lib/history';

interface RecentsViewProps {
  isLoadingRecents: boolean;
  items: DriveItemData[];
  dispatch: AppDispatch;
}

class RecentsView extends Component<RecentsViewProps, {}> {

  componentDidMount(): void {
    const { dispatch } = this.props;
    const fileExplorerConfig: AppFileExplorerConfig = configService.getAppConfig().fileExplorer;

    dispatch(storageThunks.resetNamePathThunk());
    dispatch(storageThunks.fetchRecentsThunk({
      limit: fileExplorerConfig.recentsLimit
    }));
  }

  redirectToDrive = () => {
    history.push('/app');
  }

  render(): ReactNode {
    const { items, isLoadingRecents } = this.props;

    return (
      <FileExplorer
        title="Recents"
        isLoading={isLoadingRecents}
        items={items}
        onFileUploaded={this.redirectToDrive}
        onFolderCreated={this.redirectToDrive}
      />
    );
  }
}

export default connect((state: RootState) => {
  const filteredItems = storageSelectors.filteredItems(state)(state.storage.recents);

  return {
    isLoadingRecents: state.storage.isLoadingRecents,
    items: filteredItems
  };
})(RecentsView);