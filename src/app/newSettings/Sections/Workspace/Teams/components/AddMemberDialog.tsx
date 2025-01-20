import { WorkspaceUser } from '@internxt/sdk/dist/workspaces/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

import BaseCheckbox from 'app/shared/components/forms/BaseCheckbox/BaseCheckbox';
import Modal from 'app/shared/components/Modal';
import Input from 'app/shared/components/Input';
import { Button, Avatar, Loader } from '@internxt/ui';

interface AddMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  displayedMembers: WorkspaceUser[] | null;
  selectMemberToInvite: (member: WorkspaceUser) => void;
  getIsSelectedMember: (member: WorkspaceUser) => boolean;
  isGetWorkspacesMembersLoading: boolean;
  isAddMembersLoading: boolean;
  searchedMemberString: string;
  setSearchedMemberString: (searchedMemberString) => void;
  membersToInvite: WorkspaceUser[];
  addMembersToTeam: () => void;
}

const AddMemberDialog: React.FC<AddMemberDialogProps> = ({
  isOpen,
  onClose,
  displayedMembers,
  selectMemberToInvite,
  getIsSelectedMember,
  isGetWorkspacesMembersLoading,
  isAddMembersLoading,
  searchedMemberString,
  setSearchedMemberString,
  membersToInvite,
  addMembersToTeam,
}) => {
  const { translate } = useTranslationContext();

  return (
    <Modal isOpen={isOpen} onClose={onClose} width="w-480 h-480 p-5 flex flex-col justify-between">
      <div>
        <h2 className="mb-5 text-2xl font-medium text-gray-100">
          {translate('preferences.workspace.teams.addMemberDialog.title')}
        </h2>
        <Input
          placeholder={translate('preferences.workspace.teams.addMemberDialog.placeholder')}
          variant="default"
          autoComplete="off"
          onChange={setSearchedMemberString}
          value={searchedMemberString}
          name="searchMember"
          className="mb-2"
        />
        {isGetWorkspacesMembersLoading ? (
          <div className="!mt-10 flex flex h-full w-full justify-center">
            <Loader classNameLoader="h-8 w-8" />
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {displayedMembers?.map((member) => {
              const isLastItem = displayedMembers.indexOf(member) === displayedMembers.length - 1;
              const isFirstItem = displayedMembers.indexOf(member) === 0;
              const isSelectedMember = getIsSelectedMember(member);

              return (
                <button
                  onClick={() => selectMemberToInvite(member)}
                  key={member.member.uuid}
                  className={`flex h-14 w-full items-center justify-between border-x border-b border-gray-10 bg-surface px-3 py-2.5 text-base font-medium hover:bg-gray-5 ${
                    isLastItem && 'rounded-b-xl'
                  } ${isFirstItem && 'rounded-t-xl border-t'} ${isSelectedMember && '!bg-primary/10'}`}
                >
                  <div className="flex flex-row items-center space-x-2">
                    <BaseCheckbox checked={isSelectedMember} />
                    <Avatar
                      src={member.member.avatar}
                      fullName={`${member.member.name} ${member.member.lastname}`}
                      diameter={36}
                    />
                    <div className="flex flex-col">
                      <div className="flex flex-row justify-between space-x-2">
                        <span className="break-all text-base font-medium leading-5 text-gray-100">
                          {member.member.name} {member.member.lastname}
                        </span>
                      </div>
                      <span className="break-all text-left text-sm font-normal leading-4 text-gray-50">
                        {member.member.email}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="mt-5 flex w-full flex-row justify-end space-x-2">
        <Button disabled={isAddMembersLoading} variant="secondary" onClick={onClose}>
          {translate('preferences.workspace.teams.addMemberDialog.cancel')}
        </Button>
        <Button
          loading={isAddMembersLoading}
          variant="primary"
          onClick={addMembersToTeam}
          disabled={membersToInvite.length === 0}
        >
          {membersToInvite.length === 0 && translate('preferences.workspace.teams.addMemberDialog.addMember')}
          {membersToInvite.length === 1 &&
            translate('preferences.workspace.teams.addMemberDialog.addOneMember', {
              membersToInvite: membersToInvite.length,
            })}
          {membersToInvite.length > 1 &&
            translate('preferences.workspace.teams.addMemberDialog.addMembers', {
              membersToInvite: membersToInvite.length,
            })}
        </Button>
      </div>
    </Modal>
  );
};

export default AddMemberDialog;
