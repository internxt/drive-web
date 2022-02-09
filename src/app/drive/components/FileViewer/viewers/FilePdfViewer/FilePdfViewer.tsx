import UilArrowLeft from '@iconscout/react-unicons/icons/uil-angle-left-b';
import UilArrowRight from '@iconscout/react-unicons/icons/uil-angle-right-b';
import UilMinus from '@iconscout/react-unicons/icons/uil-minus';
import UilPlus from '@iconscout/react-unicons/icons/uil-plus';
import spinnerIcon from '../../../../../../assets/icons/spinner.svg';

import { Document, Page, pdfjs } from 'react-pdf';
import { useEffect, useState, Fragment } from 'react';
import { FormatFileViewerProps } from '../../FileViewer';
import { ActionState } from '@internxt/inxt-js/build/api/ActionState';
import i18n from '../../../../../i18n/services/i18n.service';
import { useAppDispatch, useAppSelector } from '../../../../../store/hooks';
import useEffectAsync from '../../../../../core/hooks/useEffectAsync';
import downloadService from '../../../../services/download.service';
import { sessionSelectors } from '../../../../../store/slices/session/session.selectors';
import { fileViewerActions, fileViewerSelectors } from '../../../../../store/slices/fileViewer';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

const FilePdfViewer = (props: FormatFileViewerProps): JSX.Element => {
  const [blobActionState, setBlobActionState] = useState<ActionState | undefined>(undefined);
  const dispatch = useAppDispatch();
  const fileUrl = useAppSelector(fileViewerSelectors.objectUrlByFileId)(props.file?.fileId || '');
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const isTeam = useAppSelector(sessionSelectors.isTeam);
  const isFirstPage = pageNumber === 1;
  const isLastPage = pageNumber === numPages;
  const [zoom, setZoom] = useState(0);
  const zoomRange = [0.85, 1, 1.5, 2, 3];

  function nextPage() {
    setPageNumber(pageNumber + 1);
    resetZoom();
  }

  function previousPage() {
    setPageNumber(pageNumber - 1);
    resetZoom();
  }

  function increaseZoom() {
    if (zoom < zoomRange.length - 1) { setZoom(zoom + 1); }
  };
  
  function decreaseZoom() {
    if (zoom > 0) { setZoom(zoom - 1); }
  };
  
  function resetZoom() {
    setZoom(0);
  };

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
    <div className="flex justify-center items-center max-h-full" >
      {props.isLoading ? (
        <div
          tabIndex={0}
          className="flex flex-row items-center justify-center h-12 px-6 bg-white bg-opacity-5 font-medium
                      rounded-xl z-10 pointer-events-none outline-none space-x-2 select-none"
        >
          <img className="animate-spin mr-2" src={spinnerIcon} alt="" />
          <span>{i18n.get('drive.loadingFile')}</span>
        </div>
      ) : (
        <Fragment>

          <div>
              <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
                <Page height={window.innerHeight * zoomRange[zoom]} pageNumber={pageNumber} />
              </Document>

            {/* Preview controls */}
            <div className="fixed bottom-6 left-1/2 flex flex-row items-center h-12 px-1.5 text-lg
                            font-medium z-10 transform -translate-x-1/2 rounded-xl overflow-hidden
                            shadow-xl select-none">
              <div className="absolute inset-0 h-full w-full backdrop-filter backdrop-blur-xl
                              backdrop-contrast-50" />
              <div className="absolute inset-0 h-full w-full bg-cool-gray-100 bg-opacity-80" />

              <div className="flex flex-row items-center justify-center space-x-1.5 z-10">

                <div className="flex flex-row items-center justify-center">
                  <button
                    onClick={previousPage}
                    disabled={isFirstPage}
                    className="flex flex-row items-center justify-center h-9 w-9 rounded-lg cursor-pointer
                                bg-white bg-opacity-0 hover:bg-opacity-10 active:bg-opacity-5 disabled:opacity-30
                                transition duration-50 ease-in-out disabled:pointer-events-none">
                    <UilArrowLeft
                      height="24"
                      width="24"
                      className={`${isFirstPage ? 'opacity-50' : ''} pointer-events-none`}
                    />
                  </button>

                  <span className="font-medium px-2 z-10">{pageNumber} of {numPages}</span>

                  <button
                    onClick={nextPage}
                    disabled={isLastPage}
                    className="flex flex-row items-center justify-center h-9 w-9 rounded-lg cursor-pointer
                                bg-white bg-opacity-0 hover:bg-opacity-10 active:bg-opacity-5 disabled:opacity-30
                                transition duration-50 ease-in-out disabled:pointer-events-none">
                    <UilArrowRight
                      height="24"
                      width="24"
                      className={`${isLastPage ? 'opacity-50' : ''} pointer-events-none`}
                    />
                  </button>
                </div>
                

                <div className="w-px h-8 bg-white bg-opacity-10" />
            
                <div className="flex flex-row items-center justify-center">
                  <button
                    onClick={increaseZoom}
                    disabled={zoom === zoomRange.length - 1}
                    className="flex flex-row items-center justify-center h-9 w-9 rounded-lg cursor-pointer
                                bg-white bg-opacity-0 hover:bg-opacity-10 active:bg-opacity-5 disabled:opacity-30
                                transition duration-50 ease-in-out disabled:pointer-events-none">
                    <UilPlus
                      height="24"
                      width="24"
                      className="pointer-events-none"
                    />
                  </button>

                  <button
                    onClick={() => { decreaseZoom(); }}
                    disabled={zoom === 0}
                    className="flex flex-row items-center justify-center h-9 w-9 rounded-lg cursor-pointer
                                bg-white bg-opacity-0 hover:bg-opacity-10 active:bg-opacity-5 disabled:opacity-30
                                transition duration-50 ease-in-out disabled:pointer-events-none">
                    <UilMinus
                      height="24"
                      width="24"
                      className="pointer-events-none"
                    />
                  </button>
                </div>

              </div>
            </div>

          </div>

        </Fragment>
      )}
    </div>
  );
};

export default FilePdfViewer;
