import { RootState } from '../..';

const storageSelectors = {
  isCurrentFolderEmpty(state: RootState): boolean {
    return state.storage.items.length === 0;
  },
  getInfoItem(state: RootState): any | undefined {
    return state.storage.items.find(item => item.id === state.storage.infoItemId);
  }
};

export default storageSelectors;