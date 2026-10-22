import { MouseEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getContextMenuPosition, Point } from '../helpers/contextMenuPosition';

export const useDriveExplorerContextMenu = () => {
  const [clickPoint, setClickPoint] = useState<Point | null>(null);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [areItemsHovered, setAreItemsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isOpen = clickPoint !== null;

  const closeContextMenu = useCallback(() => setClickPoint(null), []);

  const openContextMenu = useCallback((event: MouseEvent) => {
    event.preventDefault();
    const point = { x: event.clientX, y: event.clientY };
    setClickPoint(point);
    setPosition(point);
  }, []);

  const onContainerContextMenu = (event: MouseEvent) => {
    if (areItemsHovered) {
      closeContextMenu();
    } else {
      openContextMenu(event);
    }
  };

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!clickPoint || !menu) return;

    const positionOnScreen = getContextMenuPosition(
      clickPoint,
      { width: menu.offsetWidth, height: menu.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    );
    const menuContainer = menu.offsetParent?.getBoundingClientRect();
    setPosition({
      x: positionOnScreen.x - (menuContainer?.left ?? 0),
      y: positionOnScreen.y - (menuContainer?.top ?? 0),
    });
  }, [clickPoint]);

  useEffect(() => {
    const closeOnOutsideClick = (event: globalThis.MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeContextMenu();
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('contextmenu', closeOnOutsideClick);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('contextmenu', closeOnOutsideClick);
    };
  }, [closeContextMenu]);

  return {
    isOpen,
    position,
    menuRef,
    containerRef,
    openContextMenu,
    closeContextMenu,
    onContainerContextMenu,
    setAreItemsHovered,
  };
};
