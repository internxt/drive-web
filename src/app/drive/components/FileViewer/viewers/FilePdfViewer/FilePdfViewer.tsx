import UilArrowLeft from '@iconscout/react-unicons/icons/uil-angle-left-b';
import UilArrowRight from '@iconscout/react-unicons/icons/uil-angle-right-b';
import UilMinus from '@iconscout/react-unicons/icons/uil-minus';
import UilPlus from '@iconscout/react-unicons/icons/uil-plus';

import { Document, Page } from 'react-pdf';
import { useState, Fragment } from 'react';
import { FormatFileViewerProps } from '../../FileViewer';

const FilePdfViewer = (props: FormatFileViewerProps): JSX.Element => {
  const fileUrl = URL.createObjectURL(props.blob);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
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
    if (zoom < zoomRange.length - 1) {
      setZoom(zoom + 1);
    }
  }

  function decreaseZoom() {
    if (zoom > 0) {
      setZoom(zoom - 1);
    }
  }

  function resetZoom() {
    setZoom(0);
  }

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <div className="flex max-h-full items-center justify-center">
      <Fragment>
        <div>
          <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
            <Page height={window.innerHeight * zoomRange[zoom]} pageNumber={pageNumber} />
          </Document>

          {/* Preview controls */}
          <div
            className="fixed bottom-6 left-1/2 z-10 flex h-12 -translate-x-1/2 transform select-none
                            flex-row items-center overflow-hidden rounded-xl px-1.5 text-lg
                            font-medium shadow-xl"
          >
            <div
              className="absolute inset-0 h-full w-full backdrop-blur-xl backdrop-contrast-50
                              backdrop-filter"
            />
            <div className="absolute inset-0 h-full w-full bg-cool-gray-100 bg-opacity-80" />

            <div className="z-10 flex flex-row items-center justify-center space-x-1.5">
              <div className="flex flex-row items-center justify-center">
                <button
                  onClick={previousPage}
                  disabled={isFirstPage}
                  className="flex h-9 w-9 cursor-pointer flex-row items-center justify-center rounded-lg
                                bg-white bg-opacity-0 transition duration-50 ease-in-out
                                hover:bg-opacity-10 active:bg-opacity-5 disabled:pointer-events-none disabled:opacity-30"
                >
                  <UilArrowLeft
                    height="24"
                    width="24"
                    className={`${isFirstPage ? 'opacity-50' : ''} pointer-events-none`}
                  />
                </button>

                <span className="z-10 px-2 font-medium">
                  {pageNumber} of {numPages}
                </span>

                <button
                  onClick={nextPage}
                  disabled={isLastPage}
                  className="flex h-9 w-9 cursor-pointer flex-row items-center justify-center rounded-lg
                                bg-white bg-opacity-0 transition duration-50 ease-in-out
                                hover:bg-opacity-10 active:bg-opacity-5 disabled:pointer-events-none disabled:opacity-30"
                >
                  <UilArrowRight
                    height="24"
                    width="24"
                    className={`${isLastPage ? 'opacity-50' : ''} pointer-events-none`}
                  />
                </button>
              </div>

              <div className="h-8 w-px bg-white bg-opacity-10" />

              <div className="flex flex-row items-center justify-center">
                <button
                  onClick={increaseZoom}
                  disabled={zoom === zoomRange.length - 1}
                  className="flex h-9 w-9 cursor-pointer flex-row items-center justify-center rounded-lg
                                bg-white bg-opacity-0 transition duration-50 ease-in-out
                                hover:bg-opacity-10 active:bg-opacity-5 disabled:pointer-events-none disabled:opacity-30"
                >
                  <UilPlus height="24" width="24" className="pointer-events-none" />
                </button>

                <button
                  onClick={() => {
                    decreaseZoom();
                  }}
                  disabled={zoom === 0}
                  className="flex h-9 w-9 cursor-pointer flex-row items-center justify-center rounded-lg
                                bg-white bg-opacity-0 transition duration-50 ease-in-out
                                hover:bg-opacity-10 active:bg-opacity-5 disabled:pointer-events-none disabled:opacity-30"
                >
                  <UilMinus height="24" width="24" className="pointer-events-none" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    </div>
  );
};

export default FilePdfViewer;
