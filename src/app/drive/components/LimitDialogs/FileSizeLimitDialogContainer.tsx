import { useDispatch } from 'react-redux';
import navigationService from '../../../core/services/navigation.service';
import { AppView } from '../../../core/types';
import { useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import { bytesToString } from '../../services/size.service';
import FileSizeLimitDialog from './FileSizeLimitDialog';

// HARDCODED UNTIL API IS IMPLEMENTED
const SIZE_LIMIT = 1 * 1024 * 1024 * 1024;

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
      sizeLimit={bytesToString(SIZE_LIMIT)}
    />
  );
};

export default FileSizeLimitDialogContainer;
