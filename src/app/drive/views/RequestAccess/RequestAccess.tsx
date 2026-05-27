import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'app/store';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { LockSimple, CheckCircle, Clock } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import InternxtLogo from 'assets/icons/big-logo.svg?react';
import './RequestAccess.scss';
import { logOut } from 'services/auth.service';
import UserCheapCard from './UserCheapCard';
import { Button } from '@internxt/ui';
import shareService from 'app/share/services/share.service';

const TEXTAREA_MAX_LENGTH = 1000;
type Views = 'requestAccess' | 'requestSent' | 'waitingApproval';

function RequestAccess(): JSX.Element {
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  const urlParams = new URLSearchParams(window.location.search);
  const folderuuid = urlParams.get('folderuuid');
  const itemType = urlParams.get('type');

  const { translate } = useTranslationContext();

  const [view, setView] = useState<Views>('requestAccess');
  const [messageText, setMessageText] = useState<string>('');
  const [messageTextLimit, setMessageTextLimit] = useState<boolean>(false);

  useEffect(() => {
    if (messageText.length >= TEXTAREA_MAX_LENGTH) {
      setMessageTextLimit(true);
    } else {
      setMessageTextLimit(false);
    }
  }, [messageText]);

  const onRequestAccess = async (): Promise<void> => {
    // TODO add logic to request access
    await shareService.requestAccessToSharedFolder({
      itemType: itemType as 'folder' | 'file',
      uuid: folderuuid as string,
      notificationMessage: messageText,
    });
    setView('requestSent');
  };

  const onChangeAccount = (): void => {
    const queryParams: Record<string, string> = folderuuid ? { folderuuid } : {};
    logOut(queryParams);
  };

  const views: Record<Views, JSX.Element> = {
    requestAccess: (
      <div className="flex flex-col items-center py-3 gap-4">
        <div className="flex flex-col py-3 gap-1 items-center justify-center">
          <LockSimple size={64} weight="thin" className="text-primary" />
          <h4 className="text-center text-xl font-medium">{translate('modals.shareModal.requestAccess.title')}</h4>
          <p className="font-regular text-center text-base text-gray-60">
            {translate('modals.shareModal.requestAccess.description')}
          </p>
        </div>

        <div className="flex w-full flex-col">
          <textarea
            value={messageText}
            placeholder={translate('modals.shareModal.requestAccess.textarea')}
            rows={4}
            className=" w-full max-w-lg resize-none rounded-md border border-gray-40 bg-gray-1 p-3 pl-4 outline-none ring-primary/10 focus:border-primary focus:ring-3"
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
        </div>
        <Button variant="primary" className="cursor-pointer" onClick={onRequestAccess}>
          {translate('modals.shareModal.requestAccess.requestButton')}
        </Button>
      </div>
    ),
    requestSent: (
      <div className="flex flex-col gap-4 items-center justify-center">
        <CheckCircle size={80} weight="fill" className="text-primary" />
        <div className="flex flex-col gap-3 items-center text-center">
          <h4 className="text-center text-xl font-medium">
            {translate('modals.shareModal.requestAccess.requestSent.title')}
          </h4>
          <p className="font-regular mb-3 text-center text-base text-gray-60">
            {translate('modals.shareModal.requestAccess.requestSent.description')}
          </p>
        </div>
      </div>
    ),
    waitingApproval: (
      <div className="flex flex-col gap-4 items-center justify-center px-10">
        <Clock size={64} className="text-primary" />
        <div className="flex flex-col gap-2 items-center text-center">
          <h4 className="text-center text-xl font-medium">
            {translate('modals.shareModal.requestAccess.waitingForApproval.title')}
          </h4>
          <p className="font-regular text-center text-base text-gray-60">
            {translate('modals.shareModal.requestAccess.waitingForApproval.description')}
          </p>
        </div>
      </div>
    ),
  };

  return (
    <div className="flex h-full w-full flex-col items-center overflow-auto bg-surface sm:bg-gray-5">
      <div className="flex shrink-0 flex-row justify-center self-stretch py-10 sm:justify-start sm:pl-20">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>

      <div className="flex w-full max-w-[414px] shrink-0 flex-col items-center justify-start pb-8">
        <div className="flex w-full h-[431px] flex-col items-center justify-center rounded-2xl bg-surface p-5 text-gray-100 transition-all duration-100 ease-out sm:shadow-subtle-hard">
          {views[view]}
        </div>
        <UserCheapCard user={user} onChangeAccount={onChangeAccount} />
      </div>
    </div>
  );
}

export default RequestAccess;
