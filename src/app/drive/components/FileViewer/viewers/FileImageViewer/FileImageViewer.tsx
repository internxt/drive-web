import { ActionState } from '@internxt/inxt-js/build/api/ActionState';
import { useState, useEffect } from 'react';
import useEffectAsync from '../../../../../core/hooks/useEffectAsync';
import i18n from '../../../../../i18n/services/i18n.service';
import { useAppDispatch, useAppSelector } from '../../../../../store/hooks';
import { fileViewerActions, fileViewerSelectors } from '../../../../../store/slices/fileViewer';
import { sessionSelectors } from '../../../../../store/slices/session/session.selectors';
import downloadService from '../../../../services/download.service';
import { FormatFileViewerProps } from '../../FileViewer';

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
    <div className="file-image-viewer text-white">
      {props.isLoading ? <span>{i18n.get('drive.loadingFile')}</span> : <img src={fileUrl} className="shadow-lg" />}
    </div>
  );
};

export default FileImageViewer;
