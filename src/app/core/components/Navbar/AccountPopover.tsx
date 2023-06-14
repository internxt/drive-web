import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { Desktop, SignOut, UserPlus, Gear } from 'phosphor-react';
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Popover from '../../../shared/components/Popover';
import { useAppDispatch } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import { userThunks } from '../../../store/slices/user';
import desktopService from '../../services/desktop.service';
import AvatarWrapper from '../../views/Preferences/tabs/Account/AvatarWrapper';

export default function AccountPopover({
  className = '',
  user,
  plan,
}: {
  className?: string;
  user: UserSettings;
  plan: { planLimit: number; planUsage: number; showUpgrade: boolean };
}): JSX.Element {
  const dispatch = useAppDispatch();

  const { translate } = useTranslationContext();
  const fullName = `${user.name} ${user.lastname}`;

  const avatarWrapper = <AvatarWrapper diameter={36} fullName={fullName} avatarSrcURL={user.avatar} />;

  const percentageUsed = Math.round((plan.planUsage / plan.planLimit) * 100);

  const separator = <div className="border-translate my-0.5 mx-3 border-gray-10" />;

  const getDownloadApp = async () => {
    const download = await desktopService.getDownloadAppUrl();
    return download;
  };

  function onDownloadAppButtonClicked() {
    getDownloadApp()
      .then((download) => {
        window.open(download, '_self');
      })
      .catch(() => {
        notificationsService.show({
          text: 'Something went wrong while downloading the desktop app',
          type: ToastType.Error,
        });
      });
  }

  function onLogout() {
    dispatch(userThunks.logoutThunk());
  }

  function onGuestInviteClick() {
    dispatch(uiActions.setIsGuestInvitationDialogOpen(true));
  }

  const panel = (
    <div className="w-52">
      <div className="flex items-center p-3">
        {avatarWrapper}
        <div className="ml-2 min-w-0">
          <h1 className="truncate font-medium text-gray-80" style={{ lineHeight: 1 }}>
            {fullName}
          </h1>
          <h2 className="truncate text-sm text-gray-50">{user.email}</h2>
        </div>
      </div>
      <div className="flex items-center justify-between px-3 pb-1">
        <p className="text-sm text-gray-50">
          {translate('views.account.popover.spaceUsed', { space: percentageUsed })}
        </p>
        {plan.showUpgrade && (
          <Link to="/preferences?tab=billing" className="text-sm font-medium text-primary no-underline">
            {translate('actions.upgrade')}
          </Link>
        )}
      </div>
      {separator}
      <Item onClick={onDownloadAppButtonClicked}>
        <Desktop size={20} />
        <p className="ml-3">{translate('views.account.popover.downloadApp')}</p>
      </Item>
      <Link
        to="/preferences"
        className="flex cursor-pointer items-center py-2 px-3 text-gray-80 no-underline hover:bg-gray-1 hover:text-gray-80 active:bg-gray-5"
      >
        <Gear size={20} />
        <p className="ml-3">{translate('views.account.popover.settings')}</p>
      </Link>
      {user && user.sharedWorkspace && (
        <Item onClick={onGuestInviteClick}>
          <UserPlus size={20} />
          <p className="ml-3">Guest</p>
        </Item>
      )}
      <Item onClick={onLogout}>
        <SignOut size={20} />
        <p className="ml-3" data-test="logout">
          {translate('views.account.popover.logout')}
        </p>
      </Item>
    </div>
  );

  return <Popover className={className} childrenButton={avatarWrapper} panel={panel} data-test="app-header-dropdown" />;
}

function Item({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <div
      className="flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-1 active:bg-gray-5"
      onClick={onClick}
    >
      {children}
    </div>
  );
}
