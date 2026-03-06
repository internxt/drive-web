import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Button, Modal } from '@internxt/ui';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';

const USER_TIERS = ['freeUsers', 'essentialUsers', 'premiumUsers', 'ultimateUsers'] as const;

const AutomaticTrashDisposalDialog = (): JSX.Element => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isAutomaticTrashDisposalDialogOpen);

  const onClose = (): void => {
    dispatch(uiActions.setIsAutomaticTrashDisposalDialogOpen(false));
  };

  return (
    <Modal maxWidth="max-w-md" isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col space-y-2">
        <span className="w-fit rounded-[2px] bg-primary/10 px-1 pt-[0.5px] text-sm font-semibold text-primary dark:bg-[#082D66] dark:text-[#72AAFF]">
          {translate('trash.automaticDisposal.badge')}
        </span>

        <h2 className="text-2xl font-medium text-gray-100">{translate('trash.automaticDisposal.title')}</h2>

        <div className="text-lg text-gray-80">
          <p className="mt-2 whitespace-pre-line leading-tight">{translate('trash.automaticDisposal.description')}</p>
          <ul className="mb-2 mt-1 list-disc pl-8">
            {USER_TIERS.map((tier) => (
              <li key={tier}>
                <strong className="font-semibold text-gray-100">
                  {translate(`trash.automaticDisposal.${tier}.duration`)}
                </strong>{' '}
                {translate(`trash.automaticDisposal.${tier}.label`)}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-end">
          <Button className="!px-4" variant="secondary" onClick={onClose}>
            {translate('trash.automaticDisposal.close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AutomaticTrashDisposalDialog;
