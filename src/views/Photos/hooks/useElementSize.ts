import { useEffect, useState } from 'react';

interface ElementSize {
  width: number;
  height: number;
}

const NO_SIZE: ElementSize = { width: 0, height: 0 };

export const useElementSize = (element: Element | null): ElementSize => {
  const [size, setSize] = useState(NO_SIZE);

  useEffect(() => {
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [element]);

  return size;
};
