import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Role } from '@internxt/sdk/dist/drive/share/types';
import { WorkspaceTeam, UsersAndTeamsAnItemIsShareWidthResponse } from '@internxt/sdk/dist/workspaces';

import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { DriveItemData } from 'app/drive/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import { uiActions } from 'app/store/slices/ui';
import { shareItemWithTeamV2 } from 'app/drive/components/DriveExplorer/utils';
import workspacesService from 'app/core/services/workspace.service';
import errorService from 'app/core/services/error.service';

import Modal from 'app/shared/components/Modal';
import { X } from '@phosphor-icons/react';
import { Button, Loader } from '@internxt/ui';

interface ShareWithTeamDialogProps {
  item: DriveItemData;
  roles: Role[];
}

const ShareWithTeamDialog = ({ item, roles }: ShareWithTeamDialogProps) => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isShareWhithTeamDialogOpen);
  const selectedWorkspace = useSelector(workspacesSelectors.getSelectedWorkspace);
  const workspaceId = selectedWorkspace?.workspaceUser.workspaceId;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isIdLoadingInvite, setIsIdLoadingInvite] = useState<string>('');
  const [teams, setTeams] = useState<WorkspaceTeam[] | null>(null);
  const [usersAndTeams, setUsersAndTeams] = useState<UsersAndTeamsAnItemIsShareWidthResponse | null>(null);
  const [parsedTeams, setParsedTeams] = useState<WorkspaceTeam[] | null>();

  useEffect(() => {
    if (isOpen) {
      fetchTeams();
    }
  }, [isOpen]);

  useEffect(() => {
    setParsedTeams(null);
    getParsedTeams();
  }, [teams, usersAndTeams]);

  const onClose = (): void => {
    dispatch(uiActions.setIsShareWhithTeamDialogOpen(false));
    setTeams(null);
    setUsersAndTeams(null);
    setParsedTeams(undefined);
  };

  const fetchTeams = () => {
    if (workspaceId) {
      setIsLoading(true);
      getWorkspacesTeams(workspaceId);
      getUsersAndTeams();
    }
  };

  const getWorkspacesTeams = async (selectedWorkspaceId: string) => {
    try {
      const teams = await workspacesService.getWorkspaceTeams(selectedWorkspaceId);
      setTeams(teams);
    } catch (error) {
      errorService.reportError(error);
    }
  };

  const getUsersAndTeams = async () => {
    const itemType = item.isFolder ? 'folder' : 'file';
    const itemId = item.uuid;
    try {
      if (workspaceId) {
        const [promise] = workspacesService.getUsersAndTeamsAnItemIsShareWidth({
          workspaceId,
          itemType,
          itemId,
        });
        const usersAndTeams = await promise;
        setUsersAndTeams(usersAndTeams);
      }
      return true;
    } catch (error) {
      setUsersAndTeams(null);
      errorService.reportError(error);
    }
  };

  const getParsedTeams = () => {
    const parsedTeams = teams?.filter((team) => {
      return !usersAndTeams?.teamsWithRoles.some((team2) => team2.id === team.team.id);
    });
    setParsedTeams(parsedTeams);
    setIsLoading(false);
  };

  const shareWithTeam = async (workspaceId: string, teamId: string) => {
    const editorRole = roles.find((role) => role.name === 'EDITOR');
    try {
      selectedWorkspace && editorRole && (await shareItemWithTeamV2(workspaceId, item, teamId, editorRole));
      fetchTeams();
    } catch (error) {
      errorService.reportError(error);
    }
    setIsIdLoadingInvite('');
  };

  return (
    <Modal className="p-0" isOpen={isOpen} onClose={onClose}>
      <>
        <div className="flex h-16 w-full items-center justify-between space-x-4 border-b border-gray-10 px-5">
          <h4 className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl font-medium" title="Titulo">
            {translate('modals.shareWithTeamModal.title', { name: item?.plainName })}
          </h4>
          <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-black/0 transition-all duration-200 ease-in-out hover:bg-black/4 active:bg-black/8">
            {<X onClick={() => (isLoading ? null : onClose())} size={22} />}
          </div>
        </div>
        <div className="mb-2">
          <div className="flex flex-col p-5">
            <h5 className="mb-2 w-full text-base font-medium">{translate('modals.shareWithTeamModal.teams')}</h5>
            <div className="flex max-h-60 flex-col overflow-scroll">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader classNameLoader="h-7 w-7" />
                </div>
              ) : (
                <>
                  {parsedTeams?.map((team) => (
                    <div key={team.team.id} className="flex items-center justify-between border-b border-gray-10 py-2">
                      <h6>{team.team.name}</h6>
                      <Button
                        loading={team.team.id === isIdLoadingInvite}
                        size="medium"
                        onClick={() => {
                          setIsIdLoadingInvite(team.team.id);
                          shareWithTeam(team.team.workspaceId, team.team.id);
                        }}
                      >
                        {translate('modals.shareWithTeamModal.shareButton')}
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          {usersAndTeams && (
            <div className="flex flex-col px-5 pb-5">
              <h5 className="mb-2 w-full text-base font-medium">
                {translate('modals.shareWithTeamModal.teamsWithAcces')}
              </h5>
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader classNameLoader="h-7 w-7" />
                </div>
              ) : (
                <div className="flex max-h-60 flex-col overflow-scroll">
                  {usersAndTeams?.teamsWithRoles.map((team) => (
                    <div className="flex items-center justify-between py-2" key={team.id}>
                      <h6>{team.name}</h6>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </>
    </Modal>
  );
};

export default ShareWithTeamDialog;
