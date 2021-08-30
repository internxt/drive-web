import { Component, ReactNode } from 'react';
import { connect } from 'react-redux';

import FileExplorer from '../../components/FileExplorer/FileExplorer';
import { DriveItemData } from '../../models/interfaces';
import { AppDispatch, RootState } from '../../store';
import { storageSelectors } from '../../store/slices/storage';
import history from '../../lib/history';
import storageThunks from '../../store/slices/storage/storage.thunks';

interface RecentsViewProps {
  isLoadingRecents: boolean;
  items: DriveItemData[];
  dispatch: AppDispatch;
}

class RecentsView extends Component<RecentsViewProps> {
  componentDidMount(): void {
    this.props.dispatch(storageThunks.resetNamePathThunk());
    this.refreshRecents();
  }

  refreshRecents = () => {
    const { dispatch } = this.props;

    dispatch(storageThunks.fetchRecentsThunk());
  };

  redirectToDrive = () => {
    history.push('/app');
  };

  render(): ReactNode {
    const { items, isLoadingRecents } = this.props;

    return (
      <FileExplorer
        title="Recents"
        isLoading={isLoadingRecents}
        items={items}
        onItemsDeleted={this.refreshRecents}
        onFolderCreated={this.redirectToDrive}
      />
    );
  }
}

export default connect((state: RootState) => {
  const filteredItems = storageSelectors.filteredItems(state)(state.storage.lists.recents);

  return {
    isLoadingRecents: state.storage.isLoadingRecents,
    items: filteredItems,
  };
})(RecentsView);
