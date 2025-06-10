import { MutableRefObject, memo } from 'react';
import { Button } from '@internxt/ui';
import { FolderSimplePlus, UploadSimple } from '@phosphor-icons/react';
import { ReactComponent as FolderSimpleArrowUp } from 'assets/icons/FolderSimpleArrowUp.svg';
import TooltipElement, { DELAY_SHOW_MS } from '../../../shared/components/Tooltip/Tooltip';
import { t } from 'i18next';

const DriveTopBarItems = memo(
  ({
    stepOneTutorialRef,
    onUploadFileButtonClicked,
    onUploadFolderButtonClicked,
    onCreateFolderButtonClicked,
  }: {
    stepOneTutorialRef: MutableRefObject<null>;
    onUploadFileButtonClicked: () => void;
    onUploadFolderButtonClicked: () => void;
    onCreateFolderButtonClicked: () => void;
  }): JSX.Element => (
    <div className="flex items-center space-x-2">
      <div ref={stepOneTutorialRef} className="flex items-center justify-center">
        <Button variant="primary" onClick={onUploadFileButtonClicked} buttonDataCy="topBarUploadFilesButton">
          <div className="flex items-center justify-center space-x-2.5">
            <div className="flex items-center space-x-2">
              <UploadSimple size={24} />
              <span className="font-medium" data-cy="topBarUploadFilesButtonText">
                {t('actions.upload.uploadFiles')}
              </span>
            </div>
          </div>
        </Button>
      </div>
      <div
        className="relative flex items-center justify-center"
        data-tooltip-id="uploadFolder-tooltip"
        data-tooltip-content={t('actions.upload.uploadFolder')}
        data-tooltip-place="bottom"
      >
        <Button
          variant="ghost"
          className="aspect-square"
          onClick={onUploadFolderButtonClicked}
          buttonDataCy="topBarUploadFolderButton"
        >
          <FolderSimpleArrowUp className="h-6 w-6 text-gray-100" />
        </Button>
        <TooltipElement id="uploadFolder-tooltip" delayShow={DELAY_SHOW_MS} />
      </div>
      <div
        className="flex items-center justify-center"
        data-tooltip-id="createfolder-tooltip"
        data-tooltip-content={t('actions.upload.folder')}
        data-tooltip-place="bottom"
      >
        <Button
          variant="ghost"
          className="aspect-square"
          onClick={onCreateFolderButtonClicked}
          buttonDataCy="topBarCreateFolderButton"
        >
          <FolderSimplePlus className="h-6 w-6" />
        </Button>
        <TooltipElement id="createfolder-tooltip" delayShow={DELAY_SHOW_MS} />
      </div>
    </div>
  ),
);

export { DriveTopBarItems };
