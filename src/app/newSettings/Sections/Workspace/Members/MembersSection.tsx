import { WorkspaceUser } from '@internxt/sdk/dist/workspaces';
import Section from 'app/newSettings/components/Section';
import { useEffect, useState } from 'react';
import errorService from '../../../../core/services/error.service';
import workspacesService from '../../../../core/services/workspace.service';
import { bytesToString } from '../../../../drive/services/size.service';
import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';
import UsageBar from '../../../../newSettings/components/Usage/UsageBar';
import { getMemberRole, searchMembers } from '../../../../newSettings/utils/membersUtils';
import { Button, TableCell, TableRow } from '@internxt/ui';
import Card from '../../../../shared/components/Card';
import Input from '../../../../shared/components/Input';
import { RootState } from '../../../../store';
import { useAppSelector } from '../../../../store/hooks';
import workspacesSelectors from '../../../../store/slices/workspaces/workspaces.selectors';
import UserCard from './components/UserCard';
import InviteDialogContainer from './containers/InviteDialogContainer';
import MemberDetailsContainer from './containers/MemberDetailsContainer';
import { ScrollableTable } from 'app/shared/tables/ScrollableTable';

const PENDING_INVITATIONS_LIMIT = 25;
const PENDING_INVITATIONS_OFFSET = 0;

interface HeaderListProps {
  label: string;
  separator: boolean;
  width: string;
}

const MembersSection = ({ onClosePreferences }: { onClosePreferences: () => void }) => {
  const { translate } = useTranslationContext();
  const selectedWorkspace = useAppSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const isCurrentUserWorkspaceOwner = useAppSelector(workspacesSelectors.isWorkspaceOwner);
  const [searchedMemberName, setSearchedMemberName] = useState('');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<WorkspaceUser | null>(null);
  const [members, setMembers] = useState<WorkspaceUser[] | null>(null);
  const [displayedMembers, setDisplayedMembers] = useState(members);
  const [isCurrentMemberOwner, setIsCurrentMemberOwner] = useState<boolean>(false);
  const [guestUsers, setGuestUsers] = useState<number>(0);
  const headerList: HeaderListProps[] = [
    {
      label: translate('preferences.workspace.members.list.user'),
      separator: true,
      width: '40%',
    },
    {
      label: translate('preferences.workspace.members.list.usage'),
      separator: true,
      width: '40%',
    },
    {
      label: translate('preferences.workspace.members.list.storage'),
      separator: false,
      width: '20%',
    },
  ];

  useEffect(() => {
    refreshWorkspaceMembers();
  }, []);

  useEffect(() => {
    displayedMembers && getCurrentMember(selectedWorkspace?.workspaceUser.memberId);
  }, [displayedMembers]);

  useEffect(() => {
    const newMembers = searchMembers(members, searchedMemberName);
    setDisplayedMembers(newMembers);
  }, [searchedMemberName]);

  const getWorkspacePendingInvitations = async (workspaceId) => {
    try {
      const workspaceGuestsUsers = await workspacesService.getWorkspacePendingInvitations(
        workspaceId,
        PENDING_INVITATIONS_LIMIT,
        PENDING_INVITATIONS_OFFSET,
      );
      const workspaceGuestsUsersLength = workspaceGuestsUsers.length;
      setGuestUsers(workspaceGuestsUsersLength);
    } catch (error) {
      errorService.reportError(error);
    }
  };

  const getWorkspacesMembers = async (selectedWorkspaceId: string) => {
    try {
      const members = await workspacesService.getWorkspacesMembers(selectedWorkspaceId);
      setMembers([...members.activatedUsers, ...members.disabledUsers]);
      setDisplayedMembers([...members.activatedUsers, ...members.disabledUsers]);
    } catch (error) {
      errorService.reportError(error);
    }
  };

  const getCurrentMember = (workspaceMemberId) => {
    const workspaceCurrentMember = displayedMembers?.find((member) => member.memberId === workspaceMemberId);
    workspaceCurrentMember?.isOwner && setIsCurrentMemberOwner(true);
  };

  const refreshWorkspaceMembers = async () => {
    const selectedWorkspaceId = selectedWorkspace?.workspace.id;
    selectedWorkspaceId && (await getWorkspacesMembers(selectedWorkspaceId));
    await getWorkspacePendingInvitations(selectedWorkspace?.workspaceUser.workspaceId);
  };

  const renderHeader = (headerList: HeaderListProps[]) => (
    <TableRow className="rounded-t-lg bg-gray-5">
      {headerList.map((header) => (
        <TableCell
          key={header.label}
          isHeader
          style={{
            width: header.width,
          }}
          className="text-left"
        >
          <div className="flex h-full w-full justify-between py-2.5 pl-5">
            <p className="text-base font-normal">{header.label}</p>
            {header.separator && <div className="border-[0.5px] border-gray-10" />}
          </div>
        </TableCell>
      ))}
    </TableRow>
  );

  const renderBody = (displayedMembers: WorkspaceUser[] | null, setSelectedMember: (member: WorkspaceUser) => void) => (
    <>
      {displayedMembers?.map((member) => {
        const role = getMemberRole(member);
        const { id, name, lastname, email } = member.member;
        const { spaceLimit, usedSpace, backupsUsage, driveUsage } = member;
        const usedSpaceBytes = bytesToString(Number(usedSpace));

        return (
          <TableRow
            key={id}
            className="cursor-pointer border-b border-gray-10 bg-surface hover:bg-gray-5 dark:bg-gray-1 dark:hover:bg-gray-5"
            onClick={() => setSelectedMember(member)}
          >
            {/* LEFT COLUMN */}
            <TableCell className="max-w-[256px] overflow-hidden py-2 pl-5">
              <div className="flex w-full items-center justify-between font-medium text-gray-100">
                <UserCard name={name} lastName={lastname} role={role} email={email} avatarSrc="" />
              </div>
            </TableCell>
            {/* CENTER COLUMN */}
            <TableCell className="py-2 pl-5">
              <div className="flex w-full items-center justify-between text-gray-60">
                <UsageBar backupsUsage={backupsUsage} driveUsage={driveUsage} spaceLimit={spaceLimit} height="h-4" />
                <span className="ml-4">{usedSpaceBytes ?? '0Bytes'}</span>
              </div>
            </TableCell>
            {/* RIGHT COLUMN */}
            <TableCell className="py-2 pl-5">
              <div className="flex w-full items-center justify-between text-gray-60">
                <span className="text-base font-medium leading-5">{bytesToString(Number(spaceLimit))}</span>
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );

  return (
    <Section
      title={
        selectedMember
          ? selectedMember.member.name + ' ' + selectedMember.member.lastname
          : translate('preferences.workspace.members.members')
      }
      onBackButtonClicked={selectedMember ? () => setSelectedMember(null) : undefined}
      onClosePreferences={onClosePreferences}
    >
      {selectedMember ? (
        <MemberDetailsContainer
          member={selectedMember}
          refreshWorkspaceMembers={refreshWorkspaceMembers}
          getWorkspacesMembers={getWorkspacesMembers}
          updateSelectedMember={setSelectedMember}
          isOwner={isCurrentUserWorkspaceOwner}
          deselectMember={() => setSelectedMember(null)}
        />
      ) : (
        <>
          {/* MEMBERS AND GUESTS CARDS */}
          <div className="flex w-full flex-row justify-between space-x-6">
            <Card className="w-full">
              <div className="flex grow flex-col">
                <span className="text-xl font-medium text-gray-100">{members?.length}</span>
                {translate('preferences.workspace.members.members')}
                <span className="text-base font-normal text-gray-60"></span>
              </div>
            </Card>
            <Card className="w-full">
              <div className="flex grow flex-col">
                <span className="text-xl font-medium text-gray-100">{guestUsers}</span>
                <span className="text-base font-normal text-gray-60">
                  {translate('preferences.workspace.members.guests')}
                </span>
              </div>
            </Card>
          </div>
          {/* MEMBERS LIST */}
          <div className="flex flex-col space-y-3">
            <div className="flex flex-row justify-between">
              <Input
                placeholder={translate('preferences.workspace.members.search')}
                variant="email"
                autoComplete="off"
                onChange={setSearchedMemberName}
                value={searchedMemberName}
                name="memberName"
              />
              {isCurrentMemberOwner && (
                <Button variant="primary" onClick={() => setIsInviteDialogOpen(true)}>
                  {translate('preferences.workspace.members.invite')}
                </Button>
              )}
            </div>

            {/* Table */}
            <ScrollableTable
              renderHeader={() => renderHeader(headerList)}
              renderBody={() => renderBody(displayedMembers, setSelectedMember)}
              containerClassName="rounded-xl border border-gray-10"
              tableHeaderClassName="sticky top-0 z-10 border-b border-gray-10 bg-gray-1 text-gray-100"
              tableClassName="rounded-xl overflow-hidden w-full"
              tableBodyClassName="bg-none"
              numOfColumnsForSkeleton={3}
            />
          </div>
          <InviteDialogContainer isOpen={isInviteDialogOpen} onClose={() => setIsInviteDialogOpen(false)} />
        </>
      )}
    </Section>
  );
};

export default MembersSection;
