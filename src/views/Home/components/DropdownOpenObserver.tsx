import { useEffect, useRef } from 'react';

interface DropdownOpenObserverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DropdownOpenObserver = ({ open, onOpenChange }: DropdownOpenObserverProps): null => {
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current !== open) onOpenChange(open);
    wasOpen.current = open;
  }, [open]);
  return null;
};

export default DropdownOpenObserver;
