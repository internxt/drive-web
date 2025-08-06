import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlanFeatures, getPlanTitle } from './utils';

const mockTranslateList = vi.fn();
const mockTranslate = vi.fn();

describe('getPlanFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Old Plan Features', () => {
    it('should return processed features for old plans', () => {
      const planType = 'premium';
      const bytes = '1TB';
      const isOldPlan = true;
      const mockFeatures = ['Feature 1 with {{storage}} storage', 'Feature 2 includes {{storage}} space', 'Feature 3'];

      mockTranslateList.mockReturnValue(mockFeatures);

      const result = getPlanFeatures(planType, bytes, isOldPlan, mockTranslateList);

      expect(mockTranslateList).toHaveBeenCalledWith('preferences.account.plans.premium.plans.default.features', {
        returnObjects: true,
      });
      expect(result).toEqual(['Feature 1 with 1TB storage', 'Feature 2 includes 1TB space', 'Feature 3']);
    });

    it('should return empty array when translateList returns undefined for old plans', () => {
      mockTranslateList.mockReturnValue(undefined);

      const result = getPlanFeatures('premium', '1TB', true, mockTranslateList);

      expect(result).toEqual([]);
    });

    it('should handle multiple storage placeholders in single feature', () => {
      const mockFeatures = ['Get {{storage}} storage and backup {{storage}} data'];
      mockTranslateList.mockReturnValue(mockFeatures);

      const result = getPlanFeatures('basic', '500GB', true, mockTranslateList);

      expect(result).toEqual(['Get 500GB storage and backup 500GB data']);
    });
  });

  describe('New Plan Features', () => {
    it('should return processed features for new plans with VPN features', () => {
      const planType = 'premium';
      const bytes = '2TB';
      const isOldPlan = false;
      const mockBaseFeatures = ['Base feature 1', 'VPN access: {{VPN}}', 'Base feature 3'];
      const mockVpnFeatures = ['VPN Server 1', 'VPN Server 2'];

      mockTranslateList.mockReturnValueOnce(mockBaseFeatures).mockReturnValueOnce(mockVpnFeatures);

      const result = getPlanFeatures(planType, bytes, isOldPlan, mockTranslateList);

      expect(mockTranslateList).toHaveBeenCalledWith('preferences.account.plans.premium.baseFeatures', {
        returnObjects: true,
      });
      expect(mockTranslateList).toHaveBeenCalledWith('preferences.account.plans.premium.plans.2TB.features', {
        returnObjects: true,
      });
      expect(result).toEqual(['Base feature 1', 'VPN access: VPN Server 1, VPN Server 2', 'Base feature 3']);
    });

    it('should handle empty VPN features gracefully', () => {
      const mockBaseFeatures = ['Feature with {{VPN}} access'];
      mockTranslateList.mockReturnValueOnce(mockBaseFeatures).mockReturnValueOnce(undefined);

      const result = getPlanFeatures('basic', '1TB', false, mockTranslateList);

      expect(result).toEqual(['Feature with  access']);
    });

    it('should return empty array when base features are undefined', () => {
      mockTranslateList.mockReturnValue(undefined);

      const result = getPlanFeatures('premium', '2TB', false, mockTranslateList);

      expect(result).toEqual([]);
    });

    it('should handle multiple VPN placeholders in features', () => {
      const mockBaseFeatures = ['{{VPN}} servers available, connect to {{VPN}}'];
      const mockVpnFeatures = ['US', 'EU'];

      mockTranslateList.mockReturnValueOnce(mockBaseFeatures).mockReturnValueOnce(mockVpnFeatures);

      const result = getPlanFeatures('premium', '5TB', false, mockTranslateList);

      expect(result).toEqual(['US, EU servers available, connect to US, EU']);
    });
  });
});

describe('getPlanTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Title Generation', () => {
    it('should return title for old plan', () => {
      const planType = 'premium';
      const bytes = '1TB';
      const isOldPlan = true;
      const mockTitle = 'Premium Plan with {{storage}}';

      mockTranslate.mockReturnValue(mockTitle);

      const result = getPlanTitle(planType, bytes, isOldPlan, mockTranslate);

      expect(mockTranslate).toHaveBeenCalledWith('preferences.account.plans.premium.plans.default.title');
      expect(result).toBe('Premium Plan with 1TB');
    });

    it('should return title for new plan', () => {
      const planType = 'basic';
      const bytes = '500GB';
      const isOldPlan = false;
      const mockTitle = 'Basic {{storage}} Plan';

      mockTranslate.mockReturnValue(mockTitle);

      const result = getPlanTitle(planType, bytes, isOldPlan, mockTranslate);

      expect(mockTranslate).toHaveBeenCalledWith('preferences.account.plans.basic.plans.500GB.title');
      expect(result).toBe('Basic 500GB Plan');
    });

    it('should use oldTitle for 5TB plans', () => {
      const planType = 'premium';
      const bytes = '5TB';
      const isOldPlan = false;
      const mockTitle = 'Legacy Premium {{storage}}';

      mockTranslate.mockReturnValue(mockTitle);

      const result = getPlanTitle(planType, bytes, isOldPlan, mockTranslate);

      expect(mockTranslate).toHaveBeenCalledWith('preferences.account.plans.premium.plans.5TB.oldTitle');
      expect(result).toBe('Legacy Premium 5TB');
    });

    it('should use oldTitle for old 5TB plans', () => {
      const planType = 'premium';
      const bytes = '5TB';
      const isOldPlan = true;
      const mockTitle = 'Old Premium {{storage}}';

      mockTranslate.mockReturnValue(mockTitle);

      const result = getPlanTitle(planType, bytes, isOldPlan, mockTranslate);

      expect(mockTranslate).toHaveBeenCalledWith('preferences.account.plans.premium.plans.default.oldTitle');
      expect(result).toBe('Old Premium 5TB');
    });
  });

  describe('Fallback Scenarios', () => {
    it('should fallback to default title when primary title is not found', () => {
      const planType = 'premium';
      const bytes = '2TB';
      const isOldPlan = false;
      const mockDefaultTitle = 'Default Premium {{storage}}';

      mockTranslate.mockReturnValueOnce(undefined).mockReturnValueOnce(mockDefaultTitle);

      const result = getPlanTitle(planType, bytes, isOldPlan, mockTranslate);

      expect(mockTranslate).toHaveBeenCalledWith('preferences.account.plans.premium.plans.2TB.title');
      expect(mockTranslate).toHaveBeenCalledWith('preferences.account.plans.premium.plans.default.title');
      expect(result).toBe('Default Premium 2TB');
    });

    it('should return bytes as ultimate fallback', () => {
      const planType = 'premium';
      const bytes = '3TB';
      const isOldPlan = false;

      mockTranslate.mockReturnValue(undefined);

      const result = getPlanTitle(planType, bytes, isOldPlan, mockTranslate);

      expect(result).toBe('3TB');
    });

    it('should handle empty string titles properly', () => {
      const planType = 'basic';
      const bytes = '1TB';
      const isOldPlan = false;
      const mockDefaultTitle = 'Basic Default {{storage}}';

      mockTranslate.mockReturnValueOnce('').mockReturnValueOnce(mockDefaultTitle);

      const result = getPlanTitle(planType, bytes, isOldPlan, mockTranslate);

      expect(result).toBe('Basic Default 1TB');
    });

    it('should handle null titles properly', () => {
      const planType = 'basic';
      const bytes = '1TB';
      const isOldPlan = false;
      const mockDefaultTitle = 'Basic Default {{storage}}';

      mockTranslate.mockReturnValueOnce(null).mockReturnValueOnce(mockDefaultTitle);

      const result = getPlanTitle(planType, bytes, isOldPlan, mockTranslate);

      expect(result).toBe('Basic Default 1TB');
    });
  });

  describe('Storage Replacement', () => {
    it('should replace multiple storage placeholders', () => {
      const mockTitle = '{{storage}} Plan with {{storage}} storage';
      mockTranslate.mockReturnValue(mockTitle);

      const result = getPlanTitle('premium', '2TB', false, mockTranslate);

      expect(result).toBe('2TB Plan with 2TB storage');
    });

    it('should handle titles without storage placeholders', () => {
      const mockTitle = 'Premium Plan';
      mockTranslate.mockReturnValue(mockTitle);

      const result = getPlanTitle('premium', '1TB', false, mockTranslate);

      expect(result).toBe('Premium Plan');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in bytes', () => {
      const bytes = '1.5TB';
      const mockTitle = 'Plan {{storage}}';
      mockTranslate.mockReturnValue(mockTitle);

      const result = getPlanTitle('premium', bytes, false, mockTranslate);

      expect(result).toBe('Plan 1.5TB');
    });

    it('should handle empty planType', () => {
      const mockTitle = 'Generic {{storage}} Plan';
      mockTranslate.mockReturnValue(mockTitle);

      const result = getPlanTitle('', '1TB', false, mockTranslate);

      expect(mockTranslate).toHaveBeenCalledWith('preferences.account.plans..plans.1TB.title');
      expect(result).toBe('Generic 1TB Plan');
    });
  });
});
