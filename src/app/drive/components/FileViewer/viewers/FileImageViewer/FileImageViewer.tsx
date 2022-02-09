import { ActionState } from '@internxt/inxt-js/build/api/ActionState';
import { useState, useEffect } from 'react';
import useEffectAsync from '../../../../../core/hooks/useEffectAsync';
import i18n from '../../../../../i18n/services/i18n.service';
import { useAppDispatch, useAppSelector } from '../../../../../store/hooks';
import { fileViewerActions, fileViewerSelectors } from '../../../../../store/slices/fileViewer';
import { sessionSelectors } from '../../../../../store/slices/session/session.selectors';
import downloadService from '../../../../services/download.service';
import { FormatFileViewerProps } from '../../FileViewer';
import spinnerIcon from '../../../../../../assets/icons/spinner.svg';

import './FileImageViewer.scss';

const FileImageViewer = (props: FormatFileViewerProps): JSX.Element => {
  const [blobActionState, setBlobActionState] = useState<ActionState | undefined>(undefined);
  const dispatch = useAppDispatch();
  const fileUrl = useAppSelector(fileViewerSelectors.objectUrlByFileId)(props.file?.fileId || '');
  const isTeam = useAppSelector(sessionSelectors.isTeam);

  useEffectAsync(async () => {
    if (props.file) {
      props.setIsLoading(true);

      const [blobPromise, actionState] = downloadService.fetchFileBlob(props.file.fileId, {
        updateProgressCallback: () => undefined,
        isTeam,
      });

      setBlobActionState(actionState);

      const blob = await blobPromise;

      props.setIsLoading(false);
      dispatch(fileViewerActions.setObjectUrl({ fileId: props.file.fileId, url: URL.createObjectURL(blob) }));
    }
  }, [props.file]);

  useEffect(() => {
    return () => {
      blobActionState?.stop();
      dispatch(fileViewerActions.revokeObjectUrl(props.file?.fileId || ''));
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-white max-h-screen max-w-full">
      {props.isLoading ?
        <div
          tabIndex={0}
          className="flex flex-row items-center justify-center h-12 px-6 bg-white bg-opacity-5 font-medium
                      rounded-xl z-10 pointer-events-none outline-none space-x-2 select-none"
        >
          <img className="animate-spin mr-2" src={spinnerIcon} alt="" />
          <span>{i18n.get('drive.loadingFile')}</span>
        </div>
        :
        <div className="relative max-h-screen max-w-full">
          <img src={fileUrl} className="relative object-contain max-h-screen" draggable={false} />
        </div>
      }
    </div>
  );
};

export default FileImageViewer;
