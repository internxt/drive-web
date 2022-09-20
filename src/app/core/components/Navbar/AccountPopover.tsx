import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Desktop, SignOut, UserPlus, Gear } from 'phosphor-react';
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../../../shared/components/Avatar';
import Popover from '../../../shared/components/Popover';
import { useAppDispatch } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import { userThunks } from '../../../store/slices/user';
import desktopService from '../../services/desktop.service';
import analyticsService from 'app/analytics/services/analytics.service';

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

  const fullName = `${user.name} ${user.lastname}`;
  const button = <Avatar diameter={36} fullName={fullName} src={user.avatar} />;

  const percentageUsed = Math.round((plan.planUsage / plan.planLimit) * 100);

  const separator = <div className="my-0.5 mx-3 border-t border-gray-10" />;

  function onDownloadAppButtonClicked() {
    window.open(desktopService.getDownloadAppUrl(), '_self');
    analyticsService.trackClickedAvatarDropDownDownloadDesktopAppButton();
  }
  function onLogout() {
    dispatch(userThunks.logoutThunk());
  }

  function onGuestInviteClick() {
    dispatch(uiActions.setIsGuestInvitationDialogOpen(true));
  }

  const onAvatarClicked = () => {
    analyticsService.trackClickedNavbarAvatarButton();
  };

  const onUpgradeClicked = () => {
    analyticsService.trackClickedAvatarDropDownUpgradeButton();
  };

  const panel = (
    <div className="w-52">
      <div className="flex items-center p-3">
        <Avatar className="flex-shrink-0" diameter={36} fullName={fullName} src={user.avatar} />
        <div className="ml-2 min-w-0">
          <h1 className="truncate font-medium text-gray-80" style={{ lineHeight: 1 }}>
            {fullName}
          </h1>
          <h2 className="truncate text-sm text-gray-50">{user.email}</h2>
        </div>
      </div>
      <div className="flex items-center justify-between px-3 pb-1">
        <p className="text-sm text-gray-50">{`${percentageUsed}% space used`}</p>
        {plan.showUpgrade && (
          <Link to="/preferences?tab=billing" onClick={onUpgradeClicked} className="text-sm font-medium text-primary no-underline">
            Upgrade
          </Link>
        )}
      </div>
      {separator}
      <Item onClick={onDownloadAppButtonClicked}>
        <Desktop size={20} />
        <p className="ml-3">Download app</p>
      </Item>
      <Link
        to="/preferences"
        className="flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:text-gray-80 hover:bg-gray-1 active:bg-gray-5 no-underline"
      >
        <Gear size={20} />
        <p className="ml-3">Settings</p>
      </Link>
      {user && user.sharedWorkspace && (
        <Item onClick={onGuestInviteClick}>
          <UserPlus size={20} />
          <p className="ml-3">Guest</p>
        </Item>
      )}
      <Item onClick={onLogout}>
        <SignOut size={20} />
        <p className="ml-3">Log out</p>
      </Item>
    </div>
  );

  return <Popover className={className} button={button} panel={panel} onClick={onAvatarClicked} />;
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
