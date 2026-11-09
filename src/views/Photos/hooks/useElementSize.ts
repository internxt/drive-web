import { RefObject, useEffect, useState } from 'react';

interface ElementSize {
  width: number;
  height: number;
}

const NO_SIZE: ElementSize = { width: 0, height: 0 };

export const useElementSize = (elementRef: RefObject<Element>): ElementSize => {
  const [size, setSize] = useState(NO_SIZE);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [elementRef]);

  return size;
};
