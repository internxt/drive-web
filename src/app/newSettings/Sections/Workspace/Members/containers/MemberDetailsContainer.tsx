import { WorkspaceUser } from '@internxt/sdk/dist/workspaces';
import { DotsThreeVertical } from '@phosphor-icons/react';
import errorService from 'app/core/services/error.service';
import workspacesService from 'app/core/services/workspace.service';
import Usage from 'app/newSettings/components/Usage/Usage';
import { getMemberRole } from 'app/newSettings/utils/membersUtils';
import { useEffect, useState } from 'react';
import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import Card from '../../../../../shared/components/Card';
import Spinner from '../../../../../shared/components/Spinner/Spinner';
import { MemberRole, Teams, TypeTabs } from '../../../../types/types';
import ActivityTab from '../components/ActivityTab';
import DeactivateMemberModal from '../components/DeactivateModal';
import ReactivateMemberModal from '../components/ReactivateModal';
import RequestPasswordChangeModal from '../components/RequestPasswordModal';
import TeamsTab from '../components/TeamsTab';
import UserCard from '../components/UserCard';

interface MemberDetailsContainer {
  member: WorkspaceUser;
  getWorkspacesMembers: (string) => void;
  isOwner: boolean;
}

const MemberDetailsContainer = ({ member, getWorkspacesMembers, isOwner }: MemberDetailsContainer) => {
  const { translate } = useTranslationContext();
  const [isOptionsOpen, setIsOptionsOpen] = useState<boolean>(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState<boolean>(false);
  const [isDeactivatingMember, setIsDeactivatingMember] = useState<boolean>(false);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState<boolean>(false);
  const [isReactivatingMember, setIsReactivatingMember] = useState<boolean>(false);
  const [isRequestChangePasswordModalOpen, setIsRequestChangePasswordModalOpen] = useState<boolean>(false);
  const [isSendingPasswordRequest, setIsSendingPasswordRequest] = useState<boolean>(false);
  const [memberRole, setMemberRole] = useState<MemberRole>('current');

  useEffect(() => {
    const memberRole = getMemberRole(member);
    setMemberRole(memberRole);
  }, []);

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
          lastname={member.member.lastname}
          role={memberRole}
          email={member.member.email}
          avatarsrc={null}
          styleOptions={{
            avatarDiameter: 80,
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
                <div className="absolute right-0 top-16 flex flex-col items-center justify-center rounded-md border border-gray-10 bg-gray-5 shadow-sm">
                  {/* NOT INCLUDED IN INITIAL SCOPE OF MVP */}
                  {/* <button
                  onClick={() => setIsRequestChangePasswordModalOpen(true)}
                  className="flex h-10 w-full items-center justify-center rounded-t-md px-3 hover:bg-gray-20"
                >
                  <span className="truncate">{translate('preferences.workspace.members.actions.passwordChange')}</span>
                </button> */}
                  {memberRole !== 'deactivated' && (
                    <button
                      onClick={() => setIsDeactivateModalOpen(true)}
                      className="flex h-10 w-full items-center justify-center rounded-b-md px-3 hover:bg-gray-20"
                    >
                      <span className="truncate">{translate('preferences.workspace.members.actions.deactivate')}</span>
                    </button>
                  )}
                  {memberRole === 'deactivated' && (
                    <button
                      onClick={() => setIsReactivateModalOpen(true)}
                      className="flex h-10 w-full items-center justify-center rounded-b-md px-3 hover:bg-gray-20"
                    >
                      <span className="truncate">{translate('preferences.workspace.members.actions.reactivate')}</span>
                    </button>
                  )}
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
            <Spinner className="h-7 w-7 text-primary" />
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
    </div>
  );
};

export default MemberDetailsContainer;
