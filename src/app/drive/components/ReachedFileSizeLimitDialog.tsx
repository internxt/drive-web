import { Button } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Translate } from 'app/i18n/types';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { navigationService } from 'services';
import { bytesToString } from '../services/size.service';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';

const getText = (
  translate: Translate,
  maxFileSize: number,
  exceededFiles?: {
    size: number;
  }[],
): {
  title: string;
  description: string;
} => {
  const isOnlyOneFile = exceededFiles?.length === 1;
  const fileSize = exceededFiles?.[0].size;
  const parsedFileSize = bytesToString(fileSize as number);
  const parsedMaxFileSize = bytesToString(maxFileSize);

  if (isOnlyOneFile) {
    return {
      title: translate('error.fileSizeLimitExceeded.title.singleFile'),
      description: translate('error.fileSizeLimitExceeded.description.singleFile', {
        maxFileSize: parsedMaxFileSize,
        fileSize: parsedFileSize,
      }),
    };
  }

  return {
    title: translate('error.fileSizeLimitExceeded.title.multipleFiles'),
    description: translate('error.fileSizeLimitExceeded.description.multipleFiles', {
      maxFileSize: parsedMaxFileSize,
    }),
  };
};

const ReachedFileSizeLimitDialog = (): JSX.Element | null => {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const isOpen = useAppSelector((state) => state.ui.isReachedFileSizeLimitDialogOpen);
  const reachedFileSizeLImitInfo = useAppSelector((state) => state.ui.reachedFileSizeLimitDialogInfo);
  const exceededFiles = reachedFileSizeLImitInfo?.exceededFiles;
  const maxFileSize = useAppSelector((state) => state.fileVersions.limits?.maxUploadFileSize) ?? 0;
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);

  const text = getText(translate, maxFileSize, exceededFiles);

  const onClose = (): void => {
    dispatch(
      uiActions.setOpenFileSizeLimitReachedDialog({
        open: false,
      }),
    );
  };

  const onAccept = (): void => {
    navigationService.openPreferencesDialog({
      section: 'account',
      subsection: 'plans',
      workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
    });
    dispatch(uiActions.setIsPreferencesDialogOpen(true));
    onClose();
  };

  // Map it to the plans so we can highlight the next plan in the list
  const list = [
    translate('error.fileSizeLimitExceeded.planList.essential'),
    translate('error.fileSizeLimitExceeded.planList.premium'),
    translate('error.fileSizeLimitExceeded.planList.ultimate'),
  ];

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 top-0 z-50 flex bg-black/40">
      <div className="absolute left-1/2 top-1/2 flex w-full max-w-[550px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-surface text-gray-100">
        <div className="flex flex-col gap-5 p-5">
          <h2 className="text-2xl font-medium leading-8 text-gray-100">{text.title}</h2>

          <div className="flex flex-col gap-1.5">
            <p className="leading-tight text-gray-80">{text.description}</p>

            <div className="flex px-5">
              <ul className="flex flex-col gap-2">
                {list.map((item) => (
                  <li key={item} className="list-disc leading-tight text-gray-80">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-row justify-end">
            <Button variant="secondary" className="mr-2" onClick={() => onClose()}>
              {translate('actions.cancel')}
            </Button>

            <Button variant="primary" onClick={onAccept}>
              {translate('actions.upgradePlan')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReachedFileSizeLimitDialog;
