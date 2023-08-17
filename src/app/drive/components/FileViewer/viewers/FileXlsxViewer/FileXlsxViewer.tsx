import React, { useEffect, useState } from 'react';
import xlsxPreview from 'xlsx-preview';

interface FileDocumentsViewerProps {
  blob: Blob;
  setIsErrorWhileDownloading: (isErrorWhileDownloading: boolean) => void;
}

const FileXlsxViewer: React.FC<FileDocumentsViewerProps> = ({ blob, setIsErrorWhileDownloading }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    xlsxPreview
      .xlsx2Html(blob, {
        output: 'arrayBuffer',
      })
      .then((html) => {
        setHtmlContent(URL.createObjectURL(new Blob([html], { type: 'text/html' })));
      })
      .catch((err) => {
        setIsErrorWhileDownloading(true);
        console.error(err);
      });
  }, [blob]);

  return <object className="h-screen w-screen bg-white" data={htmlContent}></object>;
};

export default FileXlsxViewer;
