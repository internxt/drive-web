import { useEffect, useState, useRef, RefObject } from 'react';

type DropdownPosition = 'above' | 'below';

const DROPDOWN_POSITION = {
  ABOVE: 'above' as const,
  BELOW: 'below' as const,
};

interface UseDropdownPositioningReturn {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  dropdownPosition: DropdownPosition;
  dropdownRef: RefObject<HTMLDivElement>;
  itemRef: RefObject<HTMLElement>;
}

export const useDropdownPositioning = (): UseDropdownPositioningReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>(DROPDOWN_POSITION.BELOW);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      if (itemRef.current) {
        const rect = itemRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const menuHeight = 200;

        if (spaceBelow < menuHeight) {
          setDropdownPosition(DROPDOWN_POSITION.ABOVE);
        } else {
          setDropdownPosition(DROPDOWN_POSITION.BELOW);
        }
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return {
    isOpen,
    setIsOpen,
    dropdownPosition,
    dropdownRef,
    itemRef,
  };
};
