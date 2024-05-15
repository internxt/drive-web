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
  const isShareItemInvitationsLimitDialogOpen = useAppSelector(
    (state) => state.ui.isShareItemInvitationsLimitDialogOpen,
  );
  const typeOfLimitation = isShareItemsLimitDialogOpen ? 'max_shares' : 'max_invites';
  const onClose = () => {
    dispatch(uiActions.setIsShareItemsLimitDialogOpen(false));
    dispatch(uiActions.setIsShareItemInvitationsLimitDialogOpen(false));
  };

  const onSeePlansButtonClicked = () => {
    navigationService.push(AppView.Preferences, { tab: 'plans' });
    onClose();
  };
  return (
    <ShareItemsLimitDialog
      isOpen={isShareItemsLimitDialogOpen || isShareItemInvitationsLimitDialogOpen}
      typeOfLimitation={typeOfLimitation}
      onSeePlansButtonClicked={onSeePlansButtonClicked}
      onClose={onClose}
      isLoading={false}
      shareItemsLimit={SHARES_LIMIT}
    />
  );
};

export default ShareItemsLimitDialogContainer;
