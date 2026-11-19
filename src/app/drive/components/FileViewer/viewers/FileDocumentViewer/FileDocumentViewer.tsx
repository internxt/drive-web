import { renderAsync } from 'docx-preview';
import { useEffect, useRef } from 'react';
import { getPortraitFitWidth } from '../../utils/fileViewerUtils';
import { FileContentViewerProps } from '../types';

const FileDocumentViewer = ({ blob, onError }: FileContentViewerProps): JSX.Element => {
  const docxContainerRef = useRef<HTMLDivElement>(null);

  function renderDocx(docxContent: HTMLElement, docxBlob: Blob) {
    //Render the docx file in the docxContent element
    renderAsync(docxBlob, docxContent)
      .then(() => {
        const docxWrapper = docxContent.querySelector('.docx-wrapper') as HTMLElement;

        // Remove the background and padding of the docxWrapper
        if (docxWrapper) {
          docxWrapper.style.background = 'none';
          docxWrapper.style.padding = '0px';
          docxWrapper.style.paddingTop = '80px';

          const portraitFitWidth = getPortraitFitWidth();
          if (portraitFitWidth) {
            docxWrapper.querySelectorAll<HTMLElement>('section.docx').forEach((page) => {
              const scale = Math.min(1, portraitFitWidth / page.offsetWidth);
              page.style.setProperty('zoom', String(scale));
            });
          }
        }
      })
      .catch((err) => {
        onError();
        console.error(err);
      });
  }

  useEffect(() => {
    const docxContent = docxContainerRef.current;
    if (docxContent && blob) {
      renderDocx(docxContent, blob);
    }
  }, [blob]);

  return (
    <div>
      <div ref={docxContainerRef} />
    </div>
  );
};

export default FileDocumentViewer;
