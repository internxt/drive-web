import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { Desktop, SignOut, UserPlus, Gear } from '@phosphor-icons/react';
import { ReactNode } from 'react';
import Popover from '../../../shared/components/Popover';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import { userThunks } from '../../../store/slices/user';
import desktopService from '../../services/desktop.service';
import AvatarWrapper from '../../../newSettings/Sections/Account/Account/components/AvatarWrapper';
import navigationService from '../../../core/services/navigation.service';
import { RootState } from 'app/store';

export default function AccountPopover({
  className = '',
  user,
  plan,
}: {
  className?: string;
  user: UserSettings;
  plan: {
    planLimit: number;
    planUsage: number;
    showUpgrade: boolean;
    businessPlanLimit: number;
    businessPlanUsage: number;
  };
}): JSX.Element {
  const dispatch = useAppDispatch();
  const { selectedWorkspace } = useAppSelector((state: RootState) => state.workspaces);
  const memberId = selectedWorkspace?.workspaceUser?.memberId;
  const usage = !memberId ? plan.planUsage : plan.businessPlanUsage;
  const limit = !memberId ? plan.planLimit : plan.businessPlanLimit;

  const { translate } = useTranslationContext();
  const name = user?.name ?? '';
  const lastName = user?.lastname ?? '';
  const fullName = name + ' ' + lastName;

  const avatarWrapper = (
    <AvatarWrapper diameter={36} style={{ minWidth: 36 }} fullName={fullName} avatarSrcURL={user.avatar} />
  );

  const percentageUsed = Math.round((usage / limit) * 100) || 0;

  const separator = <div className="border-translate mx-3 my-0.5 border-gray-10" />;

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
          <p className="truncate font-medium text-gray-80" title={fullName} style={{ lineHeight: 1 }}>
            {fullName}
          </p>
          <p className="truncate text-sm text-gray-50" title={user.email}>
            {user.email}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between px-3 pb-1">
        <p className="text-sm text-gray-50">
          {translate('views.account.popover.spaceUsed', { space: percentageUsed })}
        </p>
        {plan.showUpgrade && (
          <button
            className="w-full cursor-pointer text-sm font-medium text-primary no-underline"
            onClick={() => {
              navigationService.openPreferencesDialog({
                section: 'account',
                subsection: 'billing',
                workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
              });
              dispatch(uiActions.setIsPreferencesDialogOpen(true));
            }}
          >
            {translate('actions.upgrade')}
          </button>
        )}
      </div>
      {separator}
      <Item onClick={onDownloadAppButtonClicked}>
        <Desktop size={20} />
        <p className="ml-3">{translate('views.account.popover.downloadApp')}</p>
      </Item>
      <button
        className="flex w-full cursor-pointer items-center px-3 py-2 text-gray-80 no-underline hover:bg-gray-1 hover:text-gray-80 dark:hover:bg-gray-10"
        onClick={() => {
          navigationService.openPreferencesDialog({
            section: 'general',
            subsection: 'general',
            workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
          });
          dispatch(uiActions.setIsPreferencesDialogOpen(true));
        }}
      >
        <Gear size={20} />
        <p className="ml-3">{translate('views.account.popover.settings')}</p>
      </button>
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
      className="flex cursor-pointer items-center px-3 py-2 text-gray-80 hover:bg-gray-1 dark:hover:bg-gray-10"
      onClick={onClick}
    >
      {children}
    </div>
  );
}
