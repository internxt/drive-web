import { RootState } from '../..';

const storageSelectors = {
  getInfoItem(state: RootState): any | undefined {
    return state.storage.items.find(item => item.id === state.storage.infoItemId);
  }
};

export default storageSelectors;