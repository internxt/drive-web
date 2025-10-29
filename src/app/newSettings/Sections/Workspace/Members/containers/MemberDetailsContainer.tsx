import { WorkspaceUser } from '@internxt/sdk/dist/workspaces';
import { DotsThreeVertical } from '@phosphor-icons/react';
import errorService from 'app/core/services/error.service';
import workspacesService from 'app/core/services/workspace.service';
import Usage from 'app/newSettings/components/Usage/Usage';
import { getMemberRole } from 'app/newSettings/utils/membersUtils';
import { useAppSelector } from 'app/store/hooks';
import { PlanState, planThunks } from 'app/store/slices/plan';
import { workspaceThunks } from 'app/store/slices/workspaces/workspacesStore';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import Card from '../../../../../shared/components/Card';
import { MemberRole, Teams, TypeTabs } from '../../../../types/types';
import ActivityTab from '../components/ActivityTab';
import DeactivateMemberModal from '../components/DeactivateModal';
import LeaveMemberModal from '../components/LeaveModal';
import ReactivateMemberModal from '../components/ReactivateModal';
import RemoveMemberModal from '../components/RemoveModal';
import RequestPasswordChangeModal from '../components/RequestPasswordModal';
import TeamsTab from '../components/TeamsTab';
import UserCard from '../components/UserCard';
import { Loader } from '@internxt/ui';
import { RootState } from '../../../../../store';
import { ActionDialog } from '../../../../../contexts/dialog-manager/ActionDialogManager.context';
import { useActionDialog } from '../../../../../contexts/dialog-manager/useActionDialog';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import AppError from 'app/core/types';

interface MemberDetailsContainer {
  member: WorkspaceUser;
  isOwner: boolean;
  refreshWorkspaceMembers: () => Promise<void>;
  updateSelectedMember: (updatedMember: WorkspaceUser) => void;
  getWorkspacesMembers: (string) => void;
  deselectMember: () => void;
}

const UPDATED_SPACE_IS_NOT_VALID_FOR_MEMBER = 400;

const MemberDetailsContainer = ({
  member,
  isOwner,
  refreshWorkspaceMembers,
  updateSelectedMember,
  getWorkspacesMembers,
  deselectMember,
}: MemberDetailsContainer) => {
  const dispatch = useDispatch();
  const { translate } = useTranslationContext();
  const { openDialog, closeDialog } = useActionDialog();
  const user = useAppSelector((state) => state.user.user);

  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const maxSpacePerMember =
    plan.businessSubscription?.type === 'subscription' && plan.businessSubscription.plan?.storageLimit;
  const [isOptionsOpen, setIsOptionsOpen] = useState<boolean>(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState<boolean>(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [isModifyingMemberStorage, setIsModifyingMemberStorage] = useState<boolean>();
  const [isDeactivatingMember, setIsDeactivatingMember] = useState<boolean>(false);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState<boolean>(false);
  const [isReactivatingMember, setIsReactivatingMember] = useState<boolean>(false);
  const [isRemovingMember, setIsRemovingMember] = useState<boolean>(false);
  const [isLeavingMember, setIsLeavingMember] = useState<boolean>(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState<boolean>(false);
  const [isRequestChangePasswordModalOpen, setIsRequestChangePasswordModalOpen] = useState<boolean>(false);
  const [isSendingPasswordRequest, setIsSendingPasswordRequest] = useState<boolean>(false);
  const [memberRole, setMemberRole] = useState<MemberRole>('current');
  const isCurrentUser = user ? member.member.uuid === user.uuid : false;
  const isMemberOwner = isOwner || member.isOwner;
  const displayGuestOptions = !isMemberOwner && isCurrentUser;

  useEffect(() => {
    const memberRole = getMemberRole(member);
    setMemberRole(memberRole);
  }, []);

  const modifyStorageMember = async (spaceLimitBytes: number) => {
    try {
      setIsModifyingMemberStorage(true);
      const memberUpdated = await workspacesService.modifyMemberUsage(
        member.workspaceId,
        member.memberId,
        spaceLimitBytes,
      );
      refreshWorkspaceMembers();
      dispatch(planThunks.fetchBusinessLimitUsageThunk());
      updateSelectedMember(memberUpdated);
      notificationsService.show({
        text: translate('notificationMessages.storageModified'),
        type: ToastType.Success,
      });
    } catch (error) {
      const appError = error as AppError;
      if (appError.status === UPDATED_SPACE_IS_NOT_VALID_FOR_MEMBER) {
        notificationsService.show({
          text: translate('notificationMessages.errorModifyingStorage'),
          type: ToastType.Error,
        });
      } else {
        notificationsService.show({
          text: translate('notificationMessages.generalErrorWhileModifyingStorage'),
          type: ToastType.Error,
        });
      }
      errorService.reportError(error);
    } finally {
      setIsModifyingMemberStorage(false);
      closeDialog(ActionDialog.ModifyStorage);
    }
  };

  const deactivateMember = async () => {
    try {
      setIsDeactivatingMember(true);
      await workspacesService.deactivateMember(member.workspaceId, member.memberId);
      getWorkspacesMembers(member.workspaceId);
      setMemberRole('deactivated');
    } catch (error) {
      errorService.reportError(error);
    } finally {
      setIsDeactivatingMember(false);
      setIsDeactivateModalOpen(false);
    }
  };

  const reactivateMember = async () => {
    try {
      setIsReactivatingMember(true);
      await workspacesService.reactivateMember(member.workspaceId, member.memberId);
      getWorkspacesMembers(member.workspaceId);
      setMemberRole('member');
    } catch (error) {
      errorService.reportError(error);
    } finally {
      setIsReactivatingMember(false);
      setIsReactivateModalOpen(false);
    }
  };

  const removeMember = async () => {
    try {
      setIsRemovingMember(true);
      await workspacesService.removeMember(member.workspaceId, member.memberId);
      getWorkspacesMembers(member.workspaceId);
    } catch (error) {
      errorService.reportError(error);
    } finally {
      setIsRemovingMember(false);
      setIsRemoveModalOpen(false);
      deselectMember();
    }
  };

  const leaveMember = async () => {
    try {
      setIsLeavingMember(true);
      await workspacesService.leaveWorkspace(member.workspaceId);
    } catch (error) {
      errorService.reportError(error);
    } finally {
      setIsLeavingMember(false);
      setIsLeaveModalOpen(false);
      deselectMember();
      dispatch(workspaceThunks.setSelectedWorkspace({ workspaceId: null }));
      dispatch(workspaceThunks.fetchWorkspaces());
      dispatch(planThunks.fetchBusinessLimitUsageThunk());
    }
  };

  //  MOCK DATA TO BE IMPLENTED
  const isActivityEnabled = Math.random() < 0.5;
  const activity = [
    {
      date: 'Feb 13, 2024',
      records: [],
    },
    {
      date: 'Feb 12, 2024',
      records: [
        { title: 'Logged out', description: 'IP: 111.222.333', time: '12:35' },
        {
          title: 'Uploaded a file',
          description: 'Drive/Marketing Team/January Campaign/Budget.pdf',
          time: '12:35',
        },
        {
          title: 'Created new folder',
          description: 'Drive/Marketing Team/January Campaign',
          time: '12:35',
        },
        {
          title: 'Logged in',
          description: 'IP: 111.222.333',
          time: '12:35',
        },
      ],
    },
  ];
  const teams: { isTeams: boolean; teams: Teams } = {
    isTeams: true,
    teams: [
      { team: 'Deveolpment', role: 'owner' },
      { team: 'Marketing', role: 'member' },
    ],
  };

  const tabs: TypeTabs = [
    {
      name: translate('preferences.workspace.members.tabs.activity.name'),
      tab: 'activity',
      view: <ActivityTab role={memberRole} isActivityEnabled={isActivityEnabled} activity={activity} />,
    },
    {
      name: translate('preferences.workspace.members.tabs.teams.title'),
      tab: 'teams',
      view: <TeamsTab role={memberRole} teams={teams.teams} isTeams={teams.isTeams} />,
    },
  ];
  // const [activeTab, setActiveTab] = useState<ActiveTab>(tabs[0]);

  return (
    <div className="flex flex-col space-y-8">
      <div className="flex flex-row  justify-between">
        <UserCard
          name={member.member.name}
          lastName={member.member.lastname}
          role={memberRole}
          email={member.member.email}
          avatarSrc={null}
          styleOptions={{
            avatarDiameter: 80,
            containerClassName: '!gap-4',
            nameStyle: 'text-2xl font-medium text-gray-100',
            emailStyle: 'text-base font-normal text-gray-60',
            rolePosition: 'column',
          }}
        />
        {isOwner && !member.isOwner && (
          <div className="relative flex items-center justify-end">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-10 bg-gray-5 shadow-sm"
              onClick={() => setIsOptionsOpen(!isOptionsOpen)}
            >
              <DotsThreeVertical size={24} />
            </button>
            {isOptionsOpen && (
              <button onClick={() => setIsOptionsOpen(false)} className="absolute flex h-full w-full">
                <div className="absolute right-0 top-16 flex flex-col items-center justify-center rounded-md border border-gray-10 bg-surface shadow-sm dark:bg-gray-5">
                  {/* NOT INCLUDED IN INITIAL SCOPE OF MVP */}
                  {/* <button
                  onClick={() => setIsRequestChangePasswordModalOpen(true)}
                  className="flex h-10 w-full items-center justify-center rounded-t-md px-3 hover:bg-gray-20"
                >
                  <span className="truncate">{translate('preferences.workspace.members.actions.passwordChange')}</span>
                </button> */}
                  <button
                    onClick={() =>
                      openDialog(ActionDialog.ModifyStorage, {
                        data: {
                          maxSpacePerMember,
                          memberRole,
                          memberName: {
                            name: member.member.name,
                            lastName: member.member.lastname,
                          },
                          memberEmail: member.member.email,
                          memberSpace: member.spaceLimit,
                          totalUsedStorage: member.usedSpace,
                          isLoading: isModifyingMemberStorage,
                          onUpdateUserStorage: modifyStorageMember,
                        },
                      })
                    }
                    className="flex h-10 w-full items-center rounded-b-md px-3 hover:bg-gray-5 dark:hover:bg-gray-20"
                  >
                    <span className="truncate">{translate('preferences.workspace.members.actions.modifyStorage')}</span>
                  </button>
                  {memberRole !== 'deactivated' && (
                    <button
                      onClick={() => setIsDeactivateModalOpen(true)}
                      className="flex h-10 w-full items-center rounded-t-md px-3 hover:bg-gray-5 dark:hover:bg-gray-20"
                    >
                      <span className="truncate">{translate('preferences.workspace.members.actions.deactivate')}</span>
                    </button>
                  )}
                  {memberRole === 'deactivated' && (
                    <button
                      onClick={() => setIsReactivateModalOpen(true)}
                      className="flex h-10 w-full items-center rounded-b-md px-3 hover:bg-gray-5 dark:hover:bg-gray-20"
                    >
                      <span className="truncate">{translate('preferences.workspace.members.actions.reactivate')}</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsRemoveModalOpen(true)}
                    className="flex h-10 w-full items-center rounded-b-md px-3 hover:bg-gray-5 dark:hover:bg-gray-20"
                  >
                    <span className="truncate">{translate('preferences.workspace.members.actions.remove')}</span>
                  </button>
                </div>
              </button>
            )}
          </div>
        )}

        {displayGuestOptions && (
          <div className="relative flex items-center justify-end">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-10 bg-gray-5 shadow-sm"
              onClick={() => setIsOptionsOpen(!isOptionsOpen)}
            >
              <DotsThreeVertical size={24} />
            </button>
            {isOptionsOpen && (
              <button onClick={() => setIsOptionsOpen(false)} className="absolute flex h-full w-full">
                <div className="absolute right-0 top-16 flex flex-col items-center justify-center rounded-md border border-gray-10 bg-gray-5 shadow-sm">
                  <button
                    onClick={() => setIsLeaveModalOpen(true)}
                    className="flex h-10 w-full items-center justify-center rounded-b-md px-3 hover:bg-gray-20"
                  >
                    <span className="truncate">{translate('preferences.workspace.members.actions.leave')}</span>
                  </button>
                </div>
              </button>
            )}
          </div>
        )}
      </div>
      <Card className={' w-full space-y-6 '}>
        {member ? (
          <Usage
            usedSpace={member.usedSpace}
            spaceLimit={member.spaceLimit}
            driveUsage={member.driveUsage}
            backupsUsage={member.backupsUsage}
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center">
            <Loader classNameLoader="h-7 w-7 text-primary" />
          </div>
        )}
      </Card>
      {/* NOT INCLUDED IN INITIAL SCOPE OF MVP */}
      {/* <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} /> */}
      <DeactivateMemberModal
        name={member.member.name + ' ' + member.member.lastname}
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        onDeactivate={deactivateMember}
        isLoading={isDeactivatingMember}
      />
      <ReactivateMemberModal
        name={member.member.name + ' ' + member.member.lastname}
        isOpen={isReactivateModalOpen}
        onClose={() => setIsReactivateModalOpen(false)}
        onReactivate={reactivateMember}
        isLoading={isReactivatingMember}
      />
      <RequestPasswordChangeModal
        isOpen={isRequestChangePasswordModalOpen}
        onClose={() => setIsRequestChangePasswordModalOpen(false)}
        onSendRequest={() => {
          setIsSendingPasswordRequest(true);
          setTimeout(() => {
            setIsRequestChangePasswordModalOpen(false);
            setIsSendingPasswordRequest(false);
          }, 2000);
        }}
        isLoading={isSendingPasswordRequest}
        modalWitdhClassname="w-120"
      />
      <RemoveMemberModal
        name={member.member.name + ' ' + member.member.lastname}
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        onRemove={removeMember}
        isLoading={isRemovingMember}
      />
      <LeaveMemberModal
        name={member.member.name + ' ' + member.member.lastname}
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onLeave={leaveMember}
        isLoading={isLeavingMember}
      />
    </div>
  );
};

export default MemberDetailsContainer;
