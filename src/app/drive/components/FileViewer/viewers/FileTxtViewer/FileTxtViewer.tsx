/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormatFileViewerProps } from '../../FileViewer';

const CHUNK_SIZE = 2 * 1024 * 1024;
const SCROLL_THRESHOLD_PX = 300;

const FileTxtViewer: React.FC<FormatFileViewerProps> = ({ blob, setIsPreviewAvailable }) => {
  const [content, setContent] = useState('');
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const decoderRef = useRef(new TextDecoder());
  const loadingRef = useRef(false);

  const hasMore = blob ? offset < blob.size : false;

  const readChunk = useCallback(
    async (from: number) => {
      if (!blob || loadingRef.current || from >= blob.size) return;
      loadingRef.current = true;
      setIsLoadingMore(true);
      try {
        const to = Math.min(from + CHUNK_SIZE, blob.size);
        const buffer = await blob.slice(from, to).arrayBuffer();
        const text = decoderRef.current.decode(buffer, { stream: to < blob.size });
        setContent((prev) => prev + text);
        setOffset(to);
      } catch (err) {
        setIsPreviewAvailable(false);
        console.error(err);
      } finally {
        loadingRef.current = false;
        setIsLoadingMore(false);
      }
    },
    [blob, setIsPreviewAvailable],
  );

  useEffect(() => {
    if (!blob) return;
    decoderRef.current = new TextDecoder();
    loadingRef.current = false;
    setContent('');
    setOffset(0);
    readChunk(0);
  }, [blob]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || loadingRef.current) return;
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - SCROLL_THRESHOLD_PX) {
      readChunk(offset);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden px-20 pt-20">
      <div className="h-full w-full overflow-auto bg-white p-6" onScroll={handleScroll}>
        <pre className="whitespace-pre-wrap break-words font-mono text-sm text-gray-100">{content}</pre>
      </div>
    </div>
  );
};

export default FileTxtViewer;
