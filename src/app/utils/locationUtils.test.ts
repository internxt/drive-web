import { describe, expect, it } from 'vitest';
import { getSharedLocation, getRegularLocation, getLocation } from './locationUtils';
import { DriveItemDetails, DriveItemData } from './../drive/types/index';

describe('Location Utils', () => {
  describe('getSharedLocation', () => {
    it('When the item is a folder and has ancestor path names, then it should return the correct shared location', () => {
      const item = { isFolder: true, view: 'Shared' } as unknown as DriveItemDetails;
      const ancestorPathNames = ['Folder1', 'Folder2', 'Folder3', 'Folder4'];

      const result = getSharedLocation(item, ancestorPathNames);

      expect(result).toBe('Shared/Folder1/Folder2/Folder3');
    });

    it('When the item is a folder and has no ancestor path names, then it should return just "Shared"', () => {
      const item = { isFolder: true, view: 'Shared' } as unknown as DriveItemDetails;
      const ancestorPathNames: string[] = [];

      const result = getSharedLocation(item, ancestorPathNames);

      expect(result).toBe('Shared');
    });

    it('When the item is NOT a folder and has ancestor path names, then it should return just "Shared"', () => {
      const item = { isFolder: false, view: 'Shared' } as unknown as DriveItemDetails;
      const ancestorPathNames = ['Folder1', 'Folder2', 'Folder3', 'Folder4'];

      const result = getSharedLocation(item, ancestorPathNames);

      expect(result).toBe('Shared/Folder1/Folder2/Folder3/Folder4');
    });

    it('When the item is NOT a folder and has no ancestor path names, then it should return just "Shared"', () => {
      const item = { isFolder: false, view: 'Shared' } as unknown as DriveItemDetails;
      const ancestorPathNames = [];

      const result = getSharedLocation(item, ancestorPathNames);

      expect(result).toBe('Shared');
    });
  });

  describe('getRegularLocation', () => {
    it('When item is a folder, then it should remove the last ancestor and return the correct location', () => {
      const item = { isFolder: true, view: 'Drive' } as unknown as DriveItemDetails;
      const ancestorPathNames = ['Folder1', 'Folder2'];

      const result = getRegularLocation(item, ancestorPathNames);

      expect(result).toBe('Drive/Folder1');
    });

    it('When item is not a folder, then it should return the view and the ancestor path names', () => {
      const item = { isFolder: false, view: 'Drive' } as unknown as DriveItemDetails;
      const ancestorPathNames = ['Folder1', 'Folder2', 'Folder3', 'Folder4'];

      const result = getRegularLocation(item, ancestorPathNames);

      expect(result).toBe('Drive/Folder1/Folder2/Folder3/Folder4');
    });

    it('When ancestorPathNames is empty, then it should return just the view', () => {
      const item = { isFolder: true, view: 'Drive' } as unknown as DriveItemDetails;
      const ancestorPathNames: string[] = [];

      const result = getRegularLocation(item, ancestorPathNames);

      expect(result).toBe('Drive');
    });
  });

  describe('getLocation', () => {
    const ancestors = [
      {
        type: 'folder',
        id: 26,
        name: 'ONzgORtJ77qI28jDnr+GjwJn6xELsAEqsn3FKlKNYbHR7Z129AD/WOMkAChEKx6rm7hOER2drdmXmC296dvSXtE5y5os0XCS554YYc+dcCO+DpDDt5XWks4gvYVsXnc6D/cy4aowYy14MLqtgA==',
        uuid: '9a294306-b0c2-4beb-8593-68c7c03d1e2a',
        plainName: 'January',
      },
      {
        type: 'folder',
        id: 13,
        name: 'ONzgORtJ77qI28jDnr+GjwJn6xELsAEqsn3FKlKNYbHR7Z129AD/WOMkAChEKx6rm7hOER2drdmXmC296dvSXtE5y5os0XCS554YYc+dcCODtqVJEVGkOlUa8orZ2cwY43c1BhpeMvE=',
        uuid: 'fc823037-3a1b-4d9b-8811-ae9f67cc08c2',
        plainName: 'Backend',
      },
      {
        type: 'folder',
        id: 11,
        name: 'ONzgORtJ77qI28jDnr+GjwJn6xELsAEqsn3FKlKNYbHR7Z129AD/WOMkAChEKx6rm7hOER2drdmXmC296dvSXtE5y5os0XCS554YYc+dcCNd8xS6xfncGLdpFxOCC4qZiOJB3SOwl/7XCdJ+',
        uuid: '235fa3e9-7642-43e2-b41d-ff62ea742ac9',
        plainName: 'TEAM',
      },
      {
        type: 'folder',
        id: 10,
        name: 'ONzgORtJ77qI28jDnr+GjwJn6xELsAEqsn3FKlKNYbHR7Z129AD/WOMkAChEKx6rm7hOER2drdmXmC296dvSXtE5y5os0XCS554YYc+dcCNSQTLzHoOiXQSOIcr3hBXtDZrwLDPRV2eJF/vVV1NngXwEqs5oHEMCylAxGOkXj6+A8eTG',
        uuid: '01a1cf90-69d8-4ac5-8f46-e2fff7fe31cd',
        plainName: 'f096fb75-6794-405a-b9e7-5a8ef78acd0c',
      },
    ] as unknown as DriveItemData[];

    it('When item view is "Shared", then it should call getSharedLocation', () => {
      const item = { view: 'Shared', isFolder: true } as unknown as DriveItemDetails;
      const result = getLocation(item, ancestors);

      expect(result).toBe('/Shared/TEAM/Backend');
    });

    it('When item view is "Shared" and not folder, then it should return all ancestors', () => {
      const item = { view: 'Shared', isFolder: false } as unknown as DriveItemDetails;
      const result = getLocation(item, ancestors);

      expect(result).toBe('/Shared/TEAM/Backend/January');
    });

    it('When item view is not "Shared", then it should call getRegularLocation', () => {
      const item = { view: 'Drive', isFolder: true } as unknown as DriveItemDetails;
      const ancestors = [{ name: 'Folder2' }, { name: 'Folder1' }, { name: 'Root' }] as unknown as DriveItemData[];

      const result = getLocation(item, ancestors);

      expect(result).toBe('/Drive/Folder1');
    });

    it('When ancestors is empty, then it should return the view only', () => {
      const item = { view: 'Drive', isFolder: false } as unknown as DriveItemDetails;
      const ancestors: DriveItemData[] = [];

      const result = getLocation(item, ancestors);

      expect(result).toBe('/Drive');
    });

    it('When item is not a folder and ancestors has elements, then it should return the view followed by the ancestors', () => {
      const item = { view: 'Drive', isFolder: false } as unknown as DriveItemDetails;
      const ancestors = [
        { id: 3, name: 'Folder4' },
        { id: 3, name: 'Folder3' },
        { id: 3, name: 'Folder2' },
        { id: 2, name: 'Folder1' },
        { id: 1, name: 'Root' },
      ] as unknown as DriveItemData[];

      const result = getLocation(item, ancestors);

      expect(result).toBe('/Drive/Folder1/Folder2/Folder3/Folder4');
    });
  });
});
