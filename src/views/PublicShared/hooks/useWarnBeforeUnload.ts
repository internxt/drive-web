import { useEffect } from 'react';

const handleLeavePage = (e: BeforeUnloadEvent) => {
  const confirmationMessage = '';

  e.returnValue = confirmationMessage; //Trident, Chrome 34+
  return confirmationMessage; // WebKit, Chrome <34
};

const useWarnBeforeUnload = (isActive: boolean): void => {
  useEffect(() => {
    if (isActive) {
      window.addEventListener('beforeunload', handleLeavePage);

      return () => window.removeEventListener('beforeunload', handleLeavePage);
    }
  }, [isActive]);
};

export default useWarnBeforeUnload;
