import { useState } from 'react';

export const useSidenavCollapsed = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const savedState = sessionStorage.getItem('sidenav-collapsed');
    return savedState === 'true';
  });

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      sessionStorage.setItem('sidenav-collapsed', String(newValue));
      return newValue;
    });
  };

  return { isCollapsed, handleToggleCollapse };
};
