import { useEffect, useRef } from 'react';

interface DropdownCloseObserverProps {
  open: boolean;
  onClose: () => void;
}

const DropdownCloseObserver = ({ open, onClose }: DropdownCloseObserverProps): null => {
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) onClose();
    wasOpen.current = open;
  }, [open]);
  return null;
};

export default DropdownCloseObserver;
