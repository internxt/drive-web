import { useDispatch } from 'react-redux';
import navigationService from '../../../core/services/navigation.service';
import { AppView } from '../../../core/types';
import { useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import ShareItemsLimitDialog from './ShareItemsLimitDialog';

// HARDCODED UNTIL API IS IMPLEMENTED
const SHARES_LIMIT = 10;

const ShareItemsLimitDialogContainer = () => {
  const dispatch = useDispatch();
  const isShareItemsLimitDialogOpen = useAppSelector((state) => state.ui.isShareItemsLimitDialogOpen);
  const onClose = () => dispatch(uiActions.setIsShareItemsLimitDialogOpen(false));

  const onSeePlansButtonClicked = () => {
    navigationService.push(AppView.Preferences, { tab: 'plans' });
    onClose();
  };
  return (
    <ShareItemsLimitDialog
      isOpen={isShareItemsLimitDialogOpen}
      onSeePlansButtonClicked={onSeePlansButtonClicked}
      onClose={onClose}
      isLoading={false}
      shareItemsLimit={SHARES_LIMIT}
    />
  );
};

export default ShareItemsLimitDialogContainer;
