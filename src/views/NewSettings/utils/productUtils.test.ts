import { describe, it, expect, vi } from 'vitest';
import { getProductCaptions } from './productUtils';
import { UsageDetailsProps } from 'app/drive/services/usage.service';

vi.mock('i18next', () => ({
  t: vi.fn((key: string) => key),
}));

describe('productUtils', () => {
  describe('getProductCaptions', () => {
    it('should return product captions with different usage scenarios', () => {
      const usageDetails: UsageDetailsProps = { drive: 1024, backups: 2048, photos: 0 };
      expect(getProductCaptions(usageDetails)).toEqual([
        { name: 'sideNav.drive', usageInBytes: 1024, color: 'primary' },
        { name: 'views.account.tabs.account.view.backups', usageInBytes: 2048, color: 'indigo' },
      ]);

      expect(getProductCaptions(null)).toEqual([
        { name: 'sideNav.drive', usageInBytes: 0, color: 'primary' },
        { name: 'views.account.tabs.account.view.backups', usageInBytes: 0, color: 'indigo' },
      ]);
    });
  });
});
