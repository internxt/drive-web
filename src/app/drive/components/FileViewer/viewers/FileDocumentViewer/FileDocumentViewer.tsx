import { renderAsync } from 'docx-preview';
import { useEffect } from 'react';

interface FileDocumentViewerProps {
  blob: Blob;
  setIsPreviewAvailable: (isPreviewAvailable: boolean) => void;
}

const FileDocumentViewer = ({ blob, setIsPreviewAvailable }: FileDocumentViewerProps): JSX.Element => {
  useEffect(() => {
    const docxContent = document.getElementById('docxContainer');
    if (docxContent) {
      renderAsync(blob, docxContent)
        .then(() => {
          // Después de que el contenido se haya cargado
          const docxWrapper = docxContent.querySelector('.docx-wrapper') as HTMLElement;

          if (docxWrapper) {
            docxWrapper.style.background = 'none';
            docxWrapper.style.padding = '0px';
            docxWrapper.style.paddingTop = '80px';
          }
        })
        .catch((err) => {
          setIsPreviewAvailable(false);
          console.error(err);
        });

      docxContent.onload = () => {
        const docxWrapper = document.getElementsByClassName('docx-wrapper')[0];
        //  Remove padding
        docxWrapper.setAttribute(
          'style',
          'padding: 0px !important; background: none !important; padding-top: 30px !important;',
        );
      };
    }
  }, [blob]);

  return (
    <div>
      <div id="docxContainer" />
    </div>
  );
};

export default FileDocumentViewer;
