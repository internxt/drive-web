import { MagnifyingGlassMinus, MagnifyingGlassPlus } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useEffect, useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileContentViewerProps } from '../types';
import { getPortraitFitWidth } from '../../utils/fileViewerUtils';

import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?raw';
const blob = new Blob([workerUrl], { type: 'application/javascript' });
pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);

interface PageWithObserverProps {
  pageNumber: number;
  onPageVisible: (page: number) => void;
  loading: string;
  zoom: number;
}

const observerConfig = {
  // How much of the page needs to be visible to consider page visible
  threshold: 0.5,
};

const zoomRange = [0.85, 1, 1.5, 2, 3];

const PageWithObserver: React.FC<PageWithObserverProps> = ({ pageNumber, zoom, onPageVisible, ...otherProps }) => {
  const [pageCanvas, setPageCanvas] = useState<HTMLCanvasElement | null>(null);
  const portraitFitWidth = getPortraitFitWidth();

  useEffect(() => {
    if (!pageCanvas) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) onPageVisible(pageNumber);
    }, observerConfig);
    observer.observe(pageCanvas);

    return () => observer.disconnect();
  }, [pageCanvas, pageNumber, onPageVisible]);

  return (
    <Page
      canvasRef={setPageCanvas}
      pageNumber={pageNumber}
      width={portraitFitWidth ? portraitFitWidth * zoomRange[zoom] : undefined}
      height={window.innerHeight * zoomRange[zoom]}
      renderAnnotationLayer={false}
      renderTextLayer={false}
      {...otherProps}
    />
  );
};
const DEFAULT_ZOOM = 1;

const FilePdfViewer = ({ blob, onError }: FileContentViewerProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const fileUrl = useMemo(
    () => (blob ? URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })) : null),
    [blob],
  );
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [renderPages, setRenderPages] = useState<number>();

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

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  useEffect(() => {
    if (numPages > 50) {
      if (currentPage + 15 <= numPages) {
        setRenderPages(currentPage + 15);
      } else {
        setRenderPages(currentPage + (numPages - currentPage));
      }
    } else {
      setRenderPages(numPages);
    }
  }, [currentPage, numPages]);

  return (
    <div className="flex max-h-full w-full items-center justify-center">
      <div>
        <div className="flex items-center justify-center">
          <Document file={fileUrl} loading="" onLoadSuccess={onDocumentLoadSuccess} onLoadError={onError}>
            <div className="flex flex-col items-center space-y-3">
              {Array.from(new Array(renderPages), (el, index) => (
                <PageWithObserver
                  loading=""
                  onPageVisible={setCurrentPage}
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  zoom={zoom}
                />
              ))}
            </div>
          </Document>
        </div>

        {/* Preview controls */}
        <div
          className="fixed bottom-6 left-1/2 z-10 flex h-12 -translate-x-1/2 select-none
                            flex-row items-center overflow-hidden rounded-xl px-1.5 text-lg
                            font-medium shadow-xl"
        >
          <div className="absolute inset-0 h-full w-full backdrop-blur-xl backdrop-contrast-50" />
          <div className="absolute inset-0 h-full w-full bg-black/80" />

          <div className="z-10 flex flex-row items-center justify-center space-x-1.5">
            <div className="flex flex-row items-center justify-center">
              <span className="z-10 px-2 font-medium">
                {translate('drive.pdfPage', {
                  page: currentPage,
                  pages: numPages,
                })}
              </span>
            </div>

            <div className="h-8 w-px bg-white/10" />

            <div className="flex flex-row items-center justify-center space-x-2">
              <button
                onClick={decreaseZoom}
                disabled={zoom === 0}
                className="flex h-9 w-9 cursor-pointer flex-row items-center justify-center rounded-lg
                                bg-white/0 transition duration-50 ease-in-out
                                hover:bg-white/10 active:bg-white/5 disabled:pointer-events-none disabled:opacity-30"
              >
                <MagnifyingGlassMinus height="24" width="24" className="pointer-events-none" />
              </button>
              <span>{zoomRange[zoom] * 100}%</span>
              <button
                onClick={increaseZoom}
                disabled={zoom === zoomRange.length - 1}
                className="flex h-9 w-9 cursor-pointer flex-row items-center justify-center rounded-lg
                                bg-white/0 transition duration-50 ease-in-out
                                hover:bg-white/10 active:bg-white/5 disabled:pointer-events-none disabled:opacity-30"
              >
                <MagnifyingGlassPlus height="24" width="24" className="pointer-events-none" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePdfViewer;
