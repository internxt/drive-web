import { RefObject, useEffect, useState } from 'react';

export const useIsNearViewport = (elementRef: RefObject<Element>, margin: string): boolean => {
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => setIsNearViewport(entry.isIntersecting), {
      rootMargin: margin,
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [elementRef, margin]);

  return isNearViewport;
};
