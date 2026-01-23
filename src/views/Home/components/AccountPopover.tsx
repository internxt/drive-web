import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Desktop, SignOut, Gear } from '@phosphor-icons/react';
import { ReactNode } from 'react';
import Popover from 'components/Popover';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { userThunks } from 'app/store/slices/user';
import desktopService from 'services/desktop.service';
import AvatarWrapper from '../../NewSettings/components/Sections/Account/Account/components/AvatarWrapper';
import navigationService from 'services/navigation.service';
import { RootState } from 'app/store';

interface AccountPopoverProps {
  className?: string;
  user: UserSettings;
  plan: {
    planLimit: number;
    planUsage: number;
    showUpgrade: boolean;
    businessPlanLimit: number;
    businessPlanUsage: number;
  };
}

export default function AccountPopover({ className = '', user, plan }: Readonly<AccountPopoverProps>): JSX.Element {
  const dispatch = useAppDispatch();
  const { selectedWorkspace } = useAppSelector((state: RootState) => state.workspaces);
  const memberId = selectedWorkspace?.workspaceUser?.memberId;
  const usage = memberId ? plan.businessPlanUsage : plan.planUsage;
  const limit = memberId ? plan.businessPlanLimit : plan.planLimit;

  const { translate } = useTranslationContext();
  const name = user?.name ?? '';
  const lastName = user?.lastname ?? '';
  const fullName = name + ' ' + lastName;

  const avatarWrapper = (
    <AvatarWrapper diameter={36} style={{ minWidth: 36 }} fullName={fullName} avatarSrcURL={user.avatar} />
  );

  const percentageUsed = Math.round((usage / limit) * 100) || 0;

  const separator = <div className="border-translate mx-3 my-0.5 border-gray-10" />;

  function onLogout() {
    dispatch(userThunks.logoutThunk());
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

      {user && user.sharedWorkspace && (
        <div className="flex items-center justify-between px-3 pb-1">
          <p className="text-sm text-gray-50">{translate('workspaces.sharedWorkspace')}</p>
        </div>
      )}

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
      <Item onClick={() => desktopService.openDownloadAppUrl(translate)}>
        <Desktop size={20} />
        <p className="ml-3 truncate">{translate('views.account.popover.downloadApp')}</p>
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
      <Item onClick={onLogout}>
        <SignOut size={20} />
        <p className="ml-3 truncate" data-test="logout">
          {translate('views.account.popover.logout')}
        </p>
      </Item>
    </div>
  );

  return <Popover className={className} childrenButton={avatarWrapper} panel={panel} data-test="app-header-dropdown" />;
}

interface ItemProps {
  children: ReactNode;
  onClick: () => void;
}

function Item({ children, onClick }: Readonly<ItemProps>) {
  return (
    <div
      role="none"
      className="flex cursor-pointer items-center px-3 py-2 text-gray-80 hover:bg-gray-1 dark:hover:bg-gray-10"
      style={{ lineHeight: 1.25 }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
