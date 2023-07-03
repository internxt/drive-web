import { Fragment, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Transition, Dialog } from '@headlessui/react';
import { LockSimple, CheckCircle } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Button from 'app/shared/components/Button/Button';

const RequestAccesDialog = () => {
  const dispatch = useAppDispatch();
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  const { translate } = useTranslationContext();

  const [messageText, setMessageText] = useState<string>('');
  const [messageTextLimit, setMessageTextLimit] = useState<boolean>(false);
  const [requestSent, setRequestSent] = useState<boolean>(false);

  const isOpen = useAppSelector((state: RootState) => state.ui.isRequestAccesDialogOpen);

  useEffect(() => {
    if (messageText.length >= 950) {
      setMessageTextLimit(true);
    } else {
      setMessageTextLimit(false);
    }
  }, [messageText]);

  const onClose = (): void => {
    requestSent && dispatch(uiActions.setIsRequestAccesDialogOpen(false));
  };

  const onRequestAcces = (): void => {
    // TODO add logic to request access
    setRequestSent(true);
  };

  const onChangeAccount = (): void => {
    // TODO add logic to change account and redirect to link
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 z-50 bg-black bg-opacity-40" />
        </Transition.Child>
        <div className="fixed inset-0 z-50">
          <div className="flex min-h-full items-center justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-150"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel>
                {!requestSent ? (
                  <>
                    <div className="flex w-full max-w-xs transform flex-col items-center rounded-2xl bg-white p-5 text-gray-100 shadow-subtle-hard transition-all duration-100 ease-out">
                      <LockSimple size={80} weight="thin" className="mt-3" />
                      <h4 className="mt-4 text-center text-xl font-medium">
                        {translate('modals.shareModal.requestAccess.title')}
                      </h4>
                      <p className="font-regular mt-1 mb-3 text-center text-base text-gray-60">
                        {translate('modals.shareModal.requestAccess.description')}
                      </p>
                      <textarea
                        value={messageText}
                        placeholder={translate('modals.shareModal.requestAccess.textarea')}
                        rows={4}
                        className="outline-none mt-5 w-full max-w-lg resize-none rounded-6px border border-gray-20 p-3 pl-4"
                        onChange={(e) => setMessageText(String(e.target.value))}
                        maxLength={1000}
                      />
                      <span
                        className={`font-regular mt-2 flex w-full justify-end text-xs text-gray-50 ${
                          messageTextLimit && 'text-red-50'
                        }`}
                      >
                        {messageText.length === 0 ? 0 : messageText.length}/1000
                      </span>
                      <Button variant="primary" className="mt-2 w-full cursor-pointer" onClick={onRequestAcces}>
                        {translate('modals.shareModal.requestAccess.requestButton')}
                      </Button>
                    </div>
                    <div className="mt-4 w-full max-w-xs transform rounded-2xl bg-white p-5 text-gray-100 shadow-subtle-hard transition-all duration-100 ease-out">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{translate('modals.shareModal.requestAccess.logged')}</p>
                          <span className="font-regular mt-0.5 text-base text-gray-50">{user?.email}</span>
                        </div>
                        <Button variant="secondary" className="cursor-pointer" onClick={onChangeAccount}>
                          {translate('modals.shareModal.requestAccess.change')}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex w-full max-w-xs transform flex-col items-center rounded-2xl bg-white p-5 text-gray-100 shadow-subtle-hard transition-all duration-100 ease-out">
                    <CheckCircle size={80} weight="thin" className="mt-3 text-blue-60" />
                    <h4 className="mt-4 text-center text-xl font-medium">
                      {translate('modals.shareModal.requestAccess.requestSent')}
                    </h4>
                    <p className="font-regular mt-1 mb-3 text-center text-base text-gray-60">
                      {translate('modals.shareModal.requestAccess.confirmation')}
                    </p>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default RequestAccesDialog;
