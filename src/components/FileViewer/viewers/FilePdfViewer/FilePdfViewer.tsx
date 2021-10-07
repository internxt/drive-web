import * as Unicons from '@iconscout/react-unicons';

import { Document, Page, pdfjs } from 'react-pdf';
import { useEffect, useState, Fragment } from 'react';
import { FormatFileViewerProps } from '../../FileViewer';
import downloadService from '../../../../services/download.service';
import { sessionSelectors } from '../../../../store/slices/session/session.selectors';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import useEffectAsync from '../../../../hooks/useEffectAsync';
import i18n from '../../../../services/i18n.service';
import { fileViewerActions, fileViewerSelectors } from '../../../../store/slices/fileViewer';
import { ActionState } from '@internxt/inxt-js/build/api/ActionState';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const FilePdfViewer = (props: FormatFileViewerProps) => {
  const [blobActionState, setBlobActionState] = useState<ActionState | undefined>(undefined);
  const dispatch = useAppDispatch();
  const fileUrl = useAppSelector(fileViewerSelectors.objectUrlByFileId)(props.file?.fileId || '');
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const isTeam = useAppSelector(sessionSelectors.isTeam);
  const isFirstPage = pageNumber === 1;
  const isLastPage = pageNumber === numPages;

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

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }
  return (
    <div className="flex justify-center items-center max-h-full">
      {props.isLoading ? (
        <span>{i18n.get('drive.loadingFile')}</span>
      ) : (
        <Fragment>
          <button onClick={() => setPageNumber(pageNumber - 1)} className="h-12 w-12" disabled={isFirstPage}>
            <Unicons.UilArrowLeft className={`${isFirstPage ? 'opacity-50' : ''}`} />
          </button>
          <div className="mx-6">
            <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} className="shadow-lg">
              <Page height={window.innerHeight * 0.85} pageNumber={pageNumber} />
            </Document>
            <span className="text-center block w-full mt-3">
              {pageNumber} of {numPages}
            </span>
          </div>
          <button onClick={() => setPageNumber(pageNumber + 1)} className="h-12 w-12" disabled={isLastPage}>
            <Unicons.UilArrowRight className={`${isLastPage ? 'opacity-50' : ''}`} />
          </button>
        </Fragment>
      )}
    </div>
  );
};

export default FilePdfViewer;
