import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { useSidenavCollapsed } from './useSidenavCollapsed';

describe('Sidenav collapsed - Custom hook', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('When there is no saved state, then should not be collapsed', () => {
    const { result } = renderHook(() => useSidenavCollapsed());

    expect(result.current.isCollapsed).toBeFalsy();
  });

  it('When there is a saved state indicating it is collapsed, then it should return so', () => {
    sessionStorage.setItem('sidenav-collapsed', 'true');

    const { result } = renderHook(() => useSidenavCollapsed());

    expect(result.current.isCollapsed).toBe(true);
  });

  it('When it is not collapsed, then it should return so', () => {
    sessionStorage.setItem('sidenav-collapsed', 'false');

    const { result } = renderHook(() => useSidenavCollapsed());

    expect(result.current.isCollapsed).toBe(false);
  });

  it('When toggling the sidenav when it is open, then it should be marked as collapsed', () => {
    const { result } = renderHook(() => useSidenavCollapsed());

    act(() => {
      result.current.handleToggleCollapse();
    });

    expect(result.current.isCollapsed).toBe(true);
  });

  it('When toggling the sidenav when it is closed, then it should be marked as not collapsed', () => {
    const { result } = renderHook(() => useSidenavCollapsed());

    act(() => {
      result.current.handleToggleCollapse();
      result.current.handleToggleCollapse();
    });

    expect(result.current.isCollapsed).toBe(false);
  });
});
