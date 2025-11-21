import _ from 'lodash';
import { useState, useEffect } from 'react';

export default function useIdle(ms: number): boolean {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let timeout;

    function setUpTimeout() {
      timeout = setTimeout(() => {
        setIsIdle(true);
      }, ms);
    }

    function listener() {
      setIsIdle(false);
      if (timeout) clearTimeout(timeout);
      setUpTimeout();
    }

    const throttledListener = _.throttle(listener, 100);

    document.addEventListener('mousemove', throttledListener);
    document.addEventListener('click', throttledListener);
    document.addEventListener('keydown', throttledListener);

    setUpTimeout();

    return () => {
      if (timeout) clearTimeout(timeout);
      document.removeEventListener('mousemove', throttledListener);
      document.removeEventListener('click', throttledListener);
      document.removeEventListener('keydown', throttledListener);
    };
  }, []);

  return isIdle;
}
