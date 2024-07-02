import { useEffect, useState } from 'react';
import Section from 'app/newSettings/components/Section';
import { WorkspaceUser } from '@internxt/sdk/dist/workspaces';
import { useAppSelector } from '../../../../store/hooks';
import { RootState } from '../../../../store';
import workspacesService from '../../../../core/services/workspace.service';
import { bytesToString } from '../../../../drive/services/size.service';
import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';
import errorService from '../../../../core/services/error.service';
import Button from '../../../../shared/components/Button/Button';
import Card from '../../../../shared/components/Card';
import Input from '../../../../shared/components/Input';
import UserCard from './components/UserCard';
import InviteDialogContainer from './containers/InviteDialogContainer';
import MemberDetailsContainer from './containers/MemberDetailsContainer';
import { getMemberRole, searchMembers } from '../../../../newSettings/utils/membersUtils';
import UsageBar from '../../../../newSettings/components/Usage/UsageBar';

const MembersSection = ({ onClosePreferences }: { onClosePreferences: () => void }) => {
  const { translate } = useTranslationContext();
  const selectedWorkspace = useAppSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const [searchedMemberName, setSearchedMemberName] = useState('');
  const [hoverItemIndex, setHoverItemIndex] = useState<number | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<WorkspaceUser | null>(null);
  const [members, setMembers] = useState<WorkspaceUser[] | null>(null);
  const [displayedMembers, setDisplayedMembers] = useState(members);

  // MOCKED GUESTS MEMBERS
  const guestsNumber = 0;
  //   {
  //     id: '123123',
  //     name: 'Jonh',
  //     lastname: 'Doe',
  //     email: 'jonh@internxt.com',
  //     role: 'owner' as MemberRole,
  //     products: [
  //       { name: 'Drive', usageInBytes: 1720000000000, color: 'primary' },
  //       { name: 'Backups', usageInBytes: 123000, color: 'indigo' },
  //     ],
  //     storage: 2200000000000,
  //     isActivityEnabled: true,
  //     activity: [
  //       {
  //         date: 'Feb 13, 2024',
  //         records: [],
  //       },
  //       {
  //         date: 'Feb 12, 2024',
  //         records: [
  //           { title: 'Logged out', description: 'IP: 111.222.333', time: '12:35' },
  //           {
  //             title: 'Uploaded a file',
  //             description: 'Drive/Marketing Team/January Campaign/Budget.pdf',
  //             time: '12:35',
  //           },
  //           {
  //             title: 'Created new folder',
  //             description: 'Drive/Marketing Team/January Campaign',
  //             time: '12:35',
  //           },
  //           {
  //             title: 'Logged in',
  //             description: 'IP: 111.222.333',
  //             time: '12:35',
  //           },
  //         ],
  //       },
  //     ],
  //     isTeams: true,
  //     teams: [
  //       { team: 'Deveolpment', role: 'owner' },
  //       { team: 'Marketing', role: 'member' },
  //     ],
  //   },
  //   {
  //     id: '123124',
  //     name: 'Michael',
  //     lastname: 'Dalesom',
  //     email: 'michael@internxt.com',
  //     role: 'manager' as MemberRole,
  //     products: [
  //       { name: 'Drive', usageInBytes: 524000000000, color: 'primary' },
  //       { name: 'Backups', usageInBytes: 12300000, color: 'indigo' },
  //     ],
  //     storage: 1100000000000,
  //     isActivityEnabled: false,
  //     activity: [
  //       {
  //         date: 'Feb 13, 2024',
  //         records: [],
  //       },
  //     ],
  //     isTeams: false,
  //     teams: [],
  //   },
  //   {
  //     id: '123123214',
  //     name: 'Bea',
  //     lastname: 'Donell',
  //     email: 'bea@internxt.com',
  //     role: '' as MemberRole,
  //     products: [{ name: 'Drive', usageInBytes: 824000000000, color: 'primary' }],
  //     storage: 1100000000000,
  //     isActivityEnabled: true,
  //     activity: [
  //       {
  //         date: 'Feb 13, 2024',
  //         records: [],
  //       },
  //     ],
  //     isTeams: true,
  //     teams: [],
  //   },
  // ] as Member[];

  useEffect(() => {
    const selectedWorkspaceId = selectedWorkspace?.workspace.id;
    getWorkspacesMembers(selectedWorkspaceId);
  }, []);

  useEffect(() => {
    const newMembers = searchMembers(members, searchedMemberName);
    setDisplayedMembers(newMembers);
  }, [searchedMemberName]);

  const getWorkspacesMembers = async (selectedWorkspaceId) => {
    try {
      const members = await workspacesService.getWorkspacesMembers(selectedWorkspaceId);
      setMembers(members.activatedUsers);
      setDisplayedMembers(members.activatedUsers);
    } catch (error) {
      errorService.reportError(error);
    }
  };

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
        <MemberDetailsContainer member={selectedMember} />
      ) : (
        <>
          {/* MEMBERS AND GUESTS CARDS */}
          <div className="fles-row flex w-full justify-between space-x-6">
            <Card className="w-full">
              <div className="flex grow flex-col">
                <span className="text-xl font-medium text-gray-100">{members?.length}</span>
                {translate('preferences.workspace.members.members')}
                <span className="text-base font-normal text-gray-60"></span>
              </div>
            </Card>
            <Card className="w-full">
              <div className="flex grow flex-col">
                <span className="text-xl font-medium text-gray-100">{guestsNumber}</span>
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
              <Button variant="primary" onClick={() => setIsInviteDialogOpen(true)}>
                {translate('preferences.workspace.members.invite')}
              </Button>
            </div>
            <div className="flex">
              {/* LEFT COLUMN */}
              <div className="flex grow flex-col">
                <div className="flex grow flex-col">
                  <span
                    className={
                      'flex h-12 flex-row items-center justify-between rounded-tl-xl border-b border-l border-t border-gray-10 bg-gray-5 px-5 py-2 '
                    }
                  >
                    {translate('preferences.workspace.members.list.user')}
                  </span>
                </div>
                {displayedMembers &&
                  displayedMembers.map((member, i) => {
                    const role = getMemberRole(member);
                    const { id, name, lastname, email } = member.member;
                    return (
                      <button
                        key={id}
                        className={`flex h-14 flex-row justify-between border-l border-gray-10 px-5 py-2 text-base  font-medium text-gray-100 dark:bg-gray-1 ${
                          members && i === members.length - 1 ? 'rounded-bl-xl border-b' : ' border-b'
                        }
              ${hoverItemIndex === id ? 'bg-gray-5 dark:bg-gray-5' : 'bg-surface'}`}
                        onMouseEnter={() => setHoverItemIndex(id)}
                        onMouseLeave={() => setHoverItemIndex(null)}
                        onClick={() => setSelectedMember(member)}
                      >
                        <UserCard name={name} lastname={lastname} role={role} email={email} avatarsrc={''} />
                      </button>
                    );
                  })}
              </div>
              {/* CENTER COLUMN */}
              <div className="flex grow flex-col">
                <div className="flex h-12 items-center border-b border-t border-gray-10 bg-gray-5 py-2">
                  <span
                    className={
                      'flex w-full items-center justify-between border-l border-r border-gray-10 bg-gray-5 pl-5 pr-1 '
                    }
                  >
                    {translate('preferences.workspace.members.list.usage')}
                  </span>
                </div>
                {displayedMembers &&
                  displayedMembers.map((member, i) => {
                    const { spaceLimit, usedSpace, backupsUsage, driveUsage } = member;
                    const { id } = member.member;
                    const usedSpaceBytes = bytesToString(Number(usedSpace));
                    return (
                      <button
                        key={id}
                        className={`justify-betweendw flex h-14 items-center border-gray-10 px-5 py-2 text-base font-normal text-gray-60 dark:bg-gray-1 ${
                          members && i === members.length - 1 ? 'border-b' : ' border-b'
                        } ${hoverItemIndex === id ? 'bg-gray-5 dark:bg-gray-5' : 'bg-surface'}`}
                        onMouseEnter={() => setHoverItemIndex(id)}
                        onMouseLeave={() => setHoverItemIndex(null)}
                        onClick={() => setSelectedMember(member)}
                      >
                        <div className="flex w-full items-center justify-between">
                          <UsageBar
                            backupsUsage={backupsUsage}
                            driveUsage={driveUsage}
                            spaceLimit={spaceLimit}
                            height={'h-4'}
                          />
                          <span className="ml-4">{usedSpaceBytes ? usedSpaceBytes : '0Bytes'}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>
              {/* RIGHT COLUMN */}
              <div className="flex w-28 flex-col rounded-tr-xl">
                <div>
                  <div className="flex h-12 items-center truncate rounded-tr-xl border-b border-t border-gray-10 bg-gray-5 p-5">
                    <span className={'truncate rounded-tr-xl'}>
                      {translate('preferences.workspace.members.list.storage')}
                    </span>
                  </div>
                </div>
                {displayedMembers &&
                  displayedMembers.map((member, i) => {
                    const { spaceLimit } = member;
                    const { id } = member.member;
                    return (
                      <button
                        key={id}
                        className={`flex h-14 flex-row items-center justify-between border-r border-gray-10 py-2 pl-5 text-base font-normal text-gray-60 ${
                          members && i === members.length - 1 ? 'rounded-br-xl border-b' : 'border-b'
                        } ${hoverItemIndex === id ? 'bg-gray-5 dark:bg-gray-5' : ''}`}
                        onMouseEnter={() => setHoverItemIndex(id)}
                        onMouseLeave={() => setHoverItemIndex(null)}
                      >
                        <span className=" text-base font-medium leading-5">{bytesToString(Number(spaceLimit))}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
          <InviteDialogContainer isOpen={isInviteDialogOpen} onClose={() => setIsInviteDialogOpen(false)} />
        </>
      )}
    </Section>
  );
};

export default MembersSection;
