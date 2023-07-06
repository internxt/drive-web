import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'app/store';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { LockSimple, CheckCircle } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Button from 'app/shared/components/Button/Button';
import bigLogo from 'assets/icons/big-logo.svg';
import './RequestAccess.scss';

function RequestAccess(): JSX.Element {
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  const { translate } = useTranslationContext();

  const [messageText, setMessageText] = useState<string>('');
  const [messageTextLimit, setMessageTextLimit] = useState<boolean>(false);
  const [requestSent, setRequestSent] = useState<boolean>(false);

  useEffect(() => {
    if (messageText.length >= 950) {
      setMessageTextLimit(true);
    } else {
      setMessageTextLimit(false);
    }
  }, [messageText]);

  const onRequestAcces = (): void => {
    // TODO add logic to request access
    setRequestSent(true);
  };

  const onChangeAccount = (): void => {
    // TODO add logic to change account and redirect to link
  };

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-white sm:bg-gray-5">
      <div className="flex flex-shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
        <img src={bigLogo} width="120" alt="" />
      </div>

      <div className="flex h-full flex-col items-center justify-center">
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
            <div className="request-access-user-container mt-4 transform rounded-2xl bg-white p-5 text-gray-100 shadow-subtle-hard transition-all duration-100 ease-out">
              <div className="flex items-center justify-between">
                <div className="mr-4">
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
      </div>
    </div>
  );
}

export default RequestAccess;
