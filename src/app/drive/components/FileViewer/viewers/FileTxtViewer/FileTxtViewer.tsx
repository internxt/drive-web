import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormatFileViewerProps } from '../../FileViewer';

const CHUNK_SIZE = 2 * 1024 * 1024;

const FileTxtViewer: React.FC<FormatFileViewerProps> = ({ blob, setIsPreviewAvailable }) => {
  const [content, setContent] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const decoderRef = useRef(new TextDecoder());
  const loadingRef = useRef(false);
  const offsetRef = useRef(0);

  const readChunk = useCallback(async () => {
    const from = offsetRef.current;
    if (!blob || loadingRef.current || from >= blob.size) return;
    loadingRef.current = true;
    try {
      const to = Math.min(from + CHUNK_SIZE, blob.size);
      const buffer = await blob.slice(from, to).arrayBuffer();
      const text = decoderRef.current.decode(buffer, { stream: to < blob.size });
      offsetRef.current = to;
      setContent((prev) => prev + text);
    } catch (err) {
      setIsPreviewAvailable(false);
      console.error(err);
    } finally {
      loadingRef.current = false;
    }
  }, [blob, setIsPreviewAvailable]);

  useEffect(() => {
    if (!blob) return;
    decoderRef.current = new TextDecoder();
    loadingRef.current = false;
    offsetRef.current = 0;
    setContent('');
    readChunk();
  }, [blob, readChunk]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) readChunk();
      },
      { root: rootRef.current, rootMargin: '300px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [blob, readChunk]);

  return (
    <div className="flex h-screen w-screen overflow-hidden px-20 pt-20">
      <div ref={rootRef} className="h-full w-full overflow-auto bg-surface p-6">
        <pre className="whitespace-pre-wrap break-words font-mono text-sm text-gray-100">{content}</pre>
        <div ref={sentinelRef} />
      </div>
    </div>
  );
};

export default FileTxtViewer;
