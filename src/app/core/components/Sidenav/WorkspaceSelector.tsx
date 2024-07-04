import { CaretUpDown, Check, Icon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import Avatar from '../../../shared/components/Avatar';

export interface Workspace {
  uuid: string;
  name: string;
  type: 'Business' | 'Personal';
  avatar: string | null;
  isPending?: boolean;
}

interface WorkspaceSelectorProps {
  userWorkspace: Workspace;
  workspaces: Workspace[];
  onCreateWorkspaceButtonClicked: () => void;
  onChangeWorkspace: (workspaceId: string | null) => void;
  selectedWorkspace: Workspace | null;
}

const WorkspaceCard = ({
  workspace,
  isSelected,
  Icon,
  onClick,
  translate,
}: {
  workspace: Workspace;
  isSelected: boolean;
  onClick: (workspace: Workspace) => void;
  Icon: Icon;
  translate: (key: string, props?: Record<string, unknown> | undefined) => string;
}) => {
  const handleOnClick = () => {
    onClick(workspace);
  };

  return (
    <button className="w-full px-2 py-3 text-left hover:bg-gray-5 dark:hover:bg-gray-10" onClick={handleOnClick}>
      <div className="flex w-full flex-row items-center justify-between space-x-2">
        <Avatar diameter={28} fullName={workspace.name} src={workspace.avatar ? workspace.avatar : null} />
        <div className="flex grow flex-col truncate">
          <p className="truncate text-sm font-medium leading-4 text-gray-100">{workspace.name}</p>
          <p className="truncate text-xs font-medium leading-3 text-gray-60">
            {translate(`workspaces.workspaceTypes.${workspace.type.toLocaleLowerCase()}`)}
          </p>
        </div>
        <div className="h-4 w-4">{isSelected && <Icon colorRendering="bg-gray-100" weight="bold" size={16} />}</div>
      </div>
    </button>
  );
};

const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  userWorkspace,
  workspaces,
  onCreateWorkspaceButtonClicked,
  onChangeWorkspace,
  selectedWorkspace,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLInputElement>(null);

  const { translate } = useTranslationContext();

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleWorkspaceClick = (workspace: Workspace | null) => {
    if (workspace?.type === 'Personal') {
      onChangeWorkspace(null);
    } else {
      onChangeWorkspace(workspace?.uuid ?? null);
    }
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  });

  return (
    <div className="relative mb-2 inline-block w-full">
      {/* TOGGLE BUTTON */}
      <button
        className={`w-full justify-center rounded-lg border border-gray-10 ${
          isOpen ? 'bg-gray-1' : 'bg-surface'
        } p-3 text-left dark:bg-gray-5`}
        onClick={toggleDropdown}
      >
        <div className="flex w-full flex-row items-center justify-between space-x-2">
          <Avatar
            diameter={28}
            fullName={selectedWorkspace?.name ?? ''}
            src={selectedWorkspace?.avatar ? selectedWorkspace.avatar : null}
          />
          <div className="flex grow flex-col truncate">
            <p className="truncate text-sm font-medium leading-4 text-gray-100">{selectedWorkspace?.name}</p>
            <p className="truncate text-xs font-medium leading-3 text-gray-60">
              {translate(`workspaces.workspaceTypes.${selectedWorkspace?.type?.toLocaleLowerCase()}`)}
            </p>
          </div>
          <div className="w-4">
            <CaretUpDown colorRendering="bg-gray-100" weight="bold" size={16} />
          </div>
        </div>
      </button>
      {/* DROPDOWN LIST */}
      <div
        ref={dropdownRef}
        className={`fixed left-2 z-50 w-72 overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="h-1"></div>
        <div
          className={`rounded-lg border border-gray-10 bg-surface shadow-xl dark:bg-gray-5 ${
            isOpen ? 'block' : 'hidden'
          }`}
        >
          <p className="px-2 pt-3 text-sm font-medium text-gray-100">{translate('workspaces.workspaces')}</p>
          <WorkspaceCard
            key={`${userWorkspace.name}-${userWorkspace.type}`}
            workspace={{
              name: userWorkspace.name,
              uuid: userWorkspace.uuid,
              type: 'Personal',
              avatar: userWorkspace.avatar,
            }}
            isSelected={selectedWorkspace?.uuid === userWorkspace.uuid}
            Icon={Check}
            onClick={handleWorkspaceClick}
            translate={translate}
          />
          {workspaces.map((workspace) => (
            <WorkspaceCard
              key={`${workspace.name}-${workspace.type}`}
              workspace={{
                name: workspace.name,
                uuid: workspace.uuid,
                type: workspace.type,
                avatar: workspace.avatar,
              }}
              isSelected={selectedWorkspace?.uuid === workspace.uuid}
              Icon={Check}
              onClick={handleWorkspaceClick}
              translate={translate}
            />
          ))}
          {/* NOT USING FOR THE MOMENT */}
          {/* <div className="mx-3 h-px bg-gray-10"></div>
          <button
            className="w-full rounded-b-lg px-2 py-3 text-left text-sm font-medium leading-4 text-gray-100 hover:bg-gray-5 dark:hover:bg-gray-10"
            onClick={onCreateWorkspaceButtonClicked}
          >
            {translate('workspaces.createWorkspace')}
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceSelector;
