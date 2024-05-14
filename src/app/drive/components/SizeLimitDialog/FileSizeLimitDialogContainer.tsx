import { useDispatch } from 'react-redux';
import navigationService from '../../../core/services/navigation.service';
import { AppView } from '../../../core/types';
import { useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import FileSizeLimitDialog from './FileSizeLimitDialog';

const FileSizeLimitDialogContainer = () => {
  const dispatch = useDispatch();
  const isFileSizeLimitDialogOpen = useAppSelector((state) => state.ui.isFileSizeLimitDialogOpen);
  const onClose = () => dispatch(uiActions.setIsFileSizeLimitDialogOpen(false));

  const onSeePlansButtonClicked = () => {
    navigationService.push(AppView.Preferences, { tab: 'plans' });
    onClose();
  };
  return (
    <FileSizeLimitDialog
      isOpen={isFileSizeLimitDialogOpen}
      onSeePlansButtonClicked={onSeePlansButtonClicked}
      onClose={onClose}
      isLoading={false}
    />
  );
};

export default FileSizeLimitDialogContainer;
