import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { ArrowLeft, X } from '@phosphor-icons/react';
import { useShareDialogContext } from '../context';
import { setView } from '../context/ShareDialogContext.actions';
import { ItemToShare } from 'app/store/slices/storage/types';

interface HeaderProps {
  itemToShare: ItemToShare | null;
  onClose: () => void;
}

export const Header = ({ itemToShare, onClose }: HeaderProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const {
    state: { view, isLoading },
    dispatch: actionDispatch,
  } = useShareDialogContext();

  const headers = {
    general: (
      <>
        <span
          className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl font-medium"
          title={translate('modals.shareModal.title', { name: itemToShare?.item.name })}
        >
          {translate('modals.shareModal.title', { name: itemToShare?.item.name })}
        </span>
        <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-black/0 transition-all duration-200 ease-in-out hover:bg-black/4 active:bg-black/8">
          <X onClick={() => (isLoading ? null : onClose())} size={22} />
        </div>
      </>
    ),
    invite: (
      <div className="flex items-center space-x-4">
        <ArrowLeft className="cursor-pointer" onClick={() => actionDispatch(setView('general'))} size={24} />
        <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl font-medium">
          {translate('modals.shareModal.invite.title')}
        </span>
      </div>
    ),
    requests: (
      <div className="flex items-center space-x-4">
        <ArrowLeft className="cursor-pointer" onClick={() => actionDispatch(setView('general'))} size={24} />
        <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl font-medium">
          {translate('modals.shareModal.requests.title')}
        </span>
      </div>
    ),
  };

  return headers[view];
};
