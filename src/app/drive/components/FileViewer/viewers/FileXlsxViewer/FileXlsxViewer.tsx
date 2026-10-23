import React, { useEffect, useState } from 'react';
import xlsxPreview from 'xlsx-preview';
import { PORTRAIT_VIEWER_PADDING_CLASS } from '../../utils/fileViewerUtils';
import { FileContentViewerProps } from '../types';

const FileXlsxViewer: React.FC<FileContentViewerProps> = ({ blob, onError }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    if (!blob) return;

    let isCancelled = false;
    let htmlUrl: string | undefined;

    xlsxPreview
      .xlsx2Html(blob, {
        output: 'arrayBuffer',
      })
      .then((html) => {
        if (isCancelled) return;
        htmlUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        setHtmlContent(htmlUrl);
      })
      .catch((err) => {
        if (isCancelled) return;
        onError();
        console.error(err);
      });

    return () => {
      isCancelled = true;
      if (htmlUrl) URL.revokeObjectURL(htmlUrl);
    };
  }, [blob]);

  return (
    <div className={`flex h-screen w-screen overflow-hidden px-20 pt-20 ${PORTRAIT_VIEWER_PADDING_CLASS}`}>
      <object className="h-full w-full bg-white" data={htmlContent}></object>
    </div>
  );
};

export default FileXlsxViewer;
