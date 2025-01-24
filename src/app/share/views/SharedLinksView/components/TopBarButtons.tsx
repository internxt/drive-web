import { UploadSimple } from '@phosphor-icons/react';
import { Button } from '@internxt/ui';
import { ChangeEvent, LegacyRef } from 'react';
import { t } from 'i18next';
import { WorkspaceData } from '@internxt/sdk/dist/workspaces';

type TopBarButtonsProps = {
  showUploadFileButton: boolean;
  fileInputRef: LegacyRef<HTMLInputElement> | undefined;
  disableUploadFileButton: boolean;
  numberOfPendingInvitations: number;
  onClickPendingInvitationsButton: () => void;
  onUploadFileInputChanged: (e: ChangeEvent<HTMLInputElement>) => void;
  onUploadFileButtonClicked: () => void;
  selectedWorkspace: WorkspaceData | null;
};

const TopBarButtons = ({
  fileInputRef,
  onUploadFileInputChanged,
  onUploadFileButtonClicked,
  showUploadFileButton,
  numberOfPendingInvitations,
  onClickPendingInvitationsButton,
  disableUploadFileButton,
  selectedWorkspace,
}: TopBarButtonsProps) => {
  return (
    <div
      className="flex flex-row items-center"
      data-tooltip-id="delete-link-tooltip"
      data-tooltip-content={t('shared-links.item-menu.delete-link')}
      data-tooltip-place="bottom"
    >
      <input
        className="hidden"
        ref={fileInputRef}
        type="file"
        onChange={onUploadFileInputChanged}
        multiple={true}
        data-test="input-file"
      />
      {showUploadFileButton && (
        <Button
          variant="primary"
          className="mr-2"
          onClick={onUploadFileButtonClicked}
          disabled={disableUploadFileButton}
        >
          <div className="flex items-center justify-center space-x-2.5">
            <div className="flex items-center space-x-2">
              <UploadSimple size={24} />
              <span className="font-medium">{t('actions.upload.uploadFiles')}</span>
            </div>
          </div>
        </Button>
      )}
      {numberOfPendingInvitations > 0 && !selectedWorkspace && (
        <Button variant="secondary" onClick={onClickPendingInvitationsButton}>
          <div className="flex items-center space-x-2">
            <span>Pending Invitations</span>
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs text-white">
              {numberOfPendingInvitations}
            </span>
          </div>
        </Button>
      )}
    </div>
  );
};

export default TopBarButtons;
