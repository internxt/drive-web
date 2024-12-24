import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'app/store';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { LockSimple, CheckCircle } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Button } from '@internxt/ui';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import './RequestAccess.scss';
import { logOut } from '../../../auth/services/auth.service';

const TEXTAREA_MAX_LENGTH = 950;

function RequestAccess(): JSX.Element {
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  const urlParams = new URLSearchParams(window.location.search);
  const isRequestingAccess = urlParams.get('requestAccess');
  const folderuuid = urlParams.get('folderuuid');

  const { translate } = useTranslationContext();

  const [messageText, setMessageText] = useState<string>('');
  const [messageTextLimit, setMessageTextLimit] = useState<boolean>(false);
  const [requestSent, setRequestSent] = useState<boolean>(false);

  useEffect(() => {
    if (messageText.length >= TEXTAREA_MAX_LENGTH) {
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
    const queryParams: Record<string, string> = folderuuid ? { folderuuid } : {};
    logOut(queryParams);
  };

  return (
    <div className="flex h-full w-full flex-col items-center overflow-auto bg-white sm:bg-gray-5">
      <div className="flex shrink-0 flex-row justify-center self-stretch py-10 sm:justify-start sm:pl-20">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>

      <div className="flex h-full w-full max-w-xs shrink-0 flex-col items-center justify-start pb-8">
        {!requestSent ? (
          <>
            <div className="flex w-full flex-col items-center rounded-2xl bg-white p-5 text-gray-100 transition-all duration-100 ease-out sm:shadow-subtle-hard">
              <LockSimple size={80} weight="thin" className="mt-3" />
              <h4 className="mt-4 text-center text-xl font-medium">
                {translate('modals.shareModal.requestAccess.title')}
              </h4>
              <p className="font-regular mb-3 mt-1 text-center text-base text-gray-60">
                {translate('modals.shareModal.requestAccess.description')}
              </p>
              {isRequestingAccess && (
                <>
                  <textarea
                    value={messageText}
                    placeholder={translate('modals.shareModal.requestAccess.textarea')}
                    rows={4}
                    className="mt-5 w-full max-w-lg resize-none rounded-md border border-gray-40 bg-gray-1 p-3 pl-4 outline-none ring-primary/10 focus:border-primary focus:ring-3"
                    onChange={(e) => setMessageText(String(e.target.value))}
                    maxLength={1000}
                  />
                  <span
                    className={`font-regular mt-2 flex w-full justify-end text-xs text-gray-50 ${
                      messageTextLimit && 'text-red'
                    }`}
                  >
                    {messageText.length === 0 ? 0 : messageText.length}/1000
                  </span>
                  <Button variant="primary" className="mt-2 w-full cursor-pointer" onClick={onRequestAcces}>
                    {translate('modals.shareModal.requestAccess.requestButton')}
                  </Button>
                </>
              )}
            </div>

            <div className="request-access-user-container mt-4 w-full rounded-2xl bg-white p-5 text-gray-100 transition-all duration-100 ease-out sm:shadow-subtle-hard">
              <div className="flex w-full items-center justify-between">
                <div className="mr-4 flex-1">
                  <p className="text-sm font-medium">{translate('modals.shareModal.requestAccess.logged')}</p>
                  <p
                    className="font-regular mt-0.5 flex-1 truncate text-base text-gray-50"
                    style={{ maxWidth: '167px' }}
                    title={user?.email}
                  >
                    {user?.email}
                  </p>
                </div>
                <Button variant="secondary" className="cursor-pointer" onClick={onChangeAccount}>
                  {translate('modals.shareModal.requestAccess.change')}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex w-full max-w-xs flex-col items-center rounded-2xl bg-white p-5 text-gray-100 shadow-subtle-hard transition-all duration-100 ease-out">
            <CheckCircle size={80} weight="thin" className="mt-3 text-primary" />
            <h4 className="mt-4 text-center text-xl font-medium">
              {translate('modals.shareModal.requestAccess.requestSent')}
            </h4>
            <p className="font-regular mb-3 mt-1 text-center text-base text-gray-60">
              {translate('modals.shareModal.requestAccess.confirmation')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RequestAccess;
