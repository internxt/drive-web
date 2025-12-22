import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MutableRefObject } from 'react';
import { useDropdownPositioning } from './useDropdownPositioning';

const originalInnerHeight = window.innerHeight;
const setRefCurrent = <T>(ref: React.RefObject<T>, value: T) => {
  (ref as MutableRefObject<T | null>).current = value;
};

describe('Version menu behavior', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, writable: true, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, writable: true, configurable: true });
  });

  it('when clicking inside the menu, then it stays open', () => {
    const { result } = renderHook(() => useDropdownPositioning());
    const dropdownElement = document.createElement('div');
    const childElement = document.createElement('span');
    dropdownElement.appendChild(childElement);
    setRefCurrent(result.current.dropdownRef, dropdownElement);

    act(() => {
      result.current.setIsOpen(true);
    });

    act(() => {
      childElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('when clicking outside the menu, then it closes', () => {
    const { result } = renderHook(() => useDropdownPositioning());
    const dropdownElement = document.createElement('div');
    setRefCurrent(result.current.dropdownRef, dropdownElement);

    act(() => {
      result.current.setIsOpen(true);
    });

    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('when there is room below the item, then the menu opens below', async () => {
    Object.defineProperty(window, 'innerHeight', { value: 500, writable: true, configurable: true });
    const { result } = renderHook(() => useDropdownPositioning());
    const mockItem = {
      getBoundingClientRect: () => ({ bottom: 100 }) as DOMRect,
    } as unknown as HTMLElement;
    setRefCurrent(result.current.itemRef, mockItem);

    act(() => {
      result.current.setIsOpen(true);
    });

    await waitFor(() => {
      expect(result.current.dropdownPosition).toBe('below');
    });
  });

  it('when space is tight below the item, then the menu opens above', async () => {
    Object.defineProperty(window, 'innerHeight', { value: 150, writable: true, configurable: true });
    const { result } = renderHook(() => useDropdownPositioning());
    const mockItem = {
      getBoundingClientRect: () => ({ bottom: 20 }) as DOMRect,
    } as unknown as HTMLElement;
    setRefCurrent(result.current.itemRef, mockItem);

    act(() => {
      result.current.setIsOpen(true);
    });

    await waitFor(() => {
      expect(result.current.dropdownPosition).toBe('above');
    });
  });
});
