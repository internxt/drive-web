import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlanFeatures, getPlanTitle, getPlanCommingFeatures } from './utils';

const mockTranslateList = vi.fn();
const mockTranslate = vi.fn();

describe('getPlanFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Old Plan Features', () => {
    it('returns processed features for old plans', () => {
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

    it('returns [] when translateList is undefined for old plans', () => {
      mockTranslateList.mockReturnValue(undefined);

      const result = getPlanFeatures('premium', '1TB', true, mockTranslateList);
      expect(result).toEqual([]);
    });

    it('replaces multiple storage placeholders within a single feature', () => {
      const mockFeatures = ['Get {{storage}} storage and back up {{storage}} data'];
      mockTranslateList.mockReturnValue(mockFeatures);

      const result = getPlanFeatures('basic', '500GB', true, mockTranslateList);
      expect(result).toEqual(['Get 500GB storage and back up 500GB data']);
    });

    it('SPECIAL CASE: if planType is "businessPlanFeaturesList", use new-plan logic even when isOldPlan is true', () => {
      const planType = 'businessPlanFeaturesList';
      const bytes = '2TB';
      const isOldPlan = true; // should be ignored for branching
      const base = ['Base: {{VPN}}'];
      const vpn = ['Site A', 'Site B'];

      mockTranslateList
        .mockReturnValueOnce(base) // baseFeatures
        .mockReturnValueOnce(vpn); // vpn features for bytes

      const result = getPlanFeatures(planType, bytes, isOldPlan, mockTranslateList);

      expect(mockTranslateList).toHaveBeenNthCalledWith(
        1,
        'preferences.account.plans.businessPlanFeaturesList.baseFeatures',
        { returnObjects: true },
      );
      expect(mockTranslateList).toHaveBeenNthCalledWith(
        2,
        'preferences.account.plans.businessPlanFeaturesList.plans.2TB.features',
        { returnObjects: true },
      );
      expect(result).toEqual(['Base: Site A, Site B']);
    });
  });

  describe('New Plan Features', () => {
    it('returns processed features for new plans with VPN features', () => {
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

    it('handles empty VPN features gracefully', () => {
      const mockBaseFeatures = ['Feature with {{VPN}} access'];
      mockTranslateList.mockReturnValueOnce(mockBaseFeatures).mockReturnValueOnce(undefined);

      const result = getPlanFeatures('basic', '1TB', false, mockTranslateList);
      expect(result).toEqual(['Feature with  access']);
    });

    it('returns [] when baseFeatures is undefined', () => {
      mockTranslateList.mockReturnValue(undefined);

      const result = getPlanFeatures('premium', '2TB', false, mockTranslateList);
      expect(result).toEqual([]);
    });

    it('replaces multiple VPN placeholders within features', () => {
      const mockBaseFeatures = ['{{VPN}} servers available, connect to {{VPN}}'];
      const mockVpnFeatures = ['US', 'EU'];

      mockTranslateList.mockReturnValueOnce(mockBaseFeatures).mockReturnValueOnce(mockVpnFeatures);

      const result = getPlanFeatures('premium', '5TB', false, mockTranslateList);
      expect(result).toEqual(['US, EU servers available, connect to US, EU']);
    });
  });
});

describe('getPlanCommingFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns comingSoonFeatures for new plan and bytes different from 5TB', () => {
    const planType = 'premium';
    const bytes = '2TB';
    const isOldPlan = false;
    const features = ['Soon 1', 'Soon 2'];

    mockTranslateList.mockReturnValue(features);

    const result = getPlanCommingFeatures(planType, bytes, isOldPlan, mockTranslateList);
    expect(mockTranslateList).toHaveBeenCalledWith('preferences.account.plans.premium.plans.2TB.comingSoonFeatures', {
      returnObjects: true,
    });
    expect(result).toEqual(features);
  });

  it('returns [] for old plan (isOldPlan = true)', () => {
    mockTranslateList.mockReturnValue(['Soon 1']);
    const result = getPlanCommingFeatures('basic', '1TB', true, mockTranslateList);
    expect(result).toEqual([]);
  });

  it('returns [] for 5TB on a new plan (without isPlanCard)', () => {
    mockTranslateList.mockReturnValue(['Soon 5TB']);
    const result = getPlanCommingFeatures('premium', '5TB', false, mockTranslateList);
    expect(result).toEqual([]);
  });

  it('when isPlanCard = true, returns comingSoonFeatures even if 5TB or old plan', () => {
    mockTranslateList.mockReturnValue(['Card Soon']);
    const resultA = getPlanCommingFeatures('premium', '5TB', false, mockTranslateList, true);
    expect(resultA).toEqual(['Card Soon']);

    mockTranslateList.mockReturnValue(['Card Soon Old']);
    const resultB = getPlanCommingFeatures('basic', '5TB', true, mockTranslateList, true);
    expect(resultB).toEqual(['Card Soon Old']);
  });

  it('returns [] if translateList returns a non-array value', () => {
    // Simulate an unexpected value (e.g., string)

    mockTranslateList.mockReturnValue('Soon X');

    const result = getPlanCommingFeatures('premium', '2TB', false, mockTranslateList);
    expect(result).toEqual([]);
  });

  it('returns [] if translateList returns undefined', () => {
    mockTranslateList.mockReturnValue(undefined);

    const result = getPlanCommingFeatures('premium', '2TB', false, mockTranslateList);
    expect(result).toEqual([]);
  });
});

describe('getPlanTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Title Generation', () => {
    it('returns title for old plan', () => {
      const planType = 'premium';
      const bytes = '1TB';
      const isOldPlan = true;
      const mockTitle = 'Premium Plan with {{storage}}';

      mockTranslate.mockReturnValue(mockTitle);

      const result = getPlanTitle(planType, bytes, isOldPlan, mockTranslate);

      expect(mockTranslate).toHaveBeenCalledWith('preferences.account.plans.premium.plans.default.title');
      expect(result).toBe('Premium Plan with 1TB');
    });

    it('returns title for new plan', () => {
      const planType = 'basic';
      const bytes = '500GB';
      const isOldPlan = false;
      const mockTitle = 'Basic {{storage}} Plan';

      mockTranslate.mockReturnValue(mockTitle);

      const result = getPlanTitle(planType, bytes, isOldPlan, mockTranslate);

      expect(mockTranslate).toHaveBeenCalledWith('preferences.account.plans.basic.plans.500GB.title');
      expect(result).toBe('Basic 500GB Plan');
    });

    it('uses oldTitle for 5TB plans', () => {
      const planType = 'premium';
      const bytes = '5TB';
      const isOldPlan = false;
      const mockTitle = 'Legacy Premium {{storage}}';

      mockTranslate.mockReturnValue(mockTitle);

      const result = getPlanTitle(planType, bytes, isOldPlan, mockTranslate);

      expect(mockTranslate).toHaveBeenCalledWith('preferences.account.plans.premium.plans.5TB.oldTitle');
      expect(result).toBe('Legacy Premium 5TB');
    });

    it('uses oldTitle for old 5TB plans', () => {
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
    it('falls back to default title when primary title is not found', () => {
      const planType = 'premium';
      const bytes = '2TB';
      const isOldPlan = false;
      const mockDefaultTitle = 'Default Premium {{storage}}';

      mockTranslate
        .mockReturnValueOnce(undefined) // primary
        .mockReturnValueOnce(mockDefaultTitle); // default

      const result = getPlanTitle(planType, bytes, isOldPlan, mockTranslate);

      expect(mockTranslate).toHaveBeenCalledWith('preferences.account.plans.premium.plans.2TB.title');
      expect(mockTranslate).toHaveBeenCalledWith('preferences.account.plans.premium.plans.default.title');
      expect(result).toBe('Default Premium 2TB');
    });

    it('returns bytes as the ultimate fallback', () => {
      const planType = 'premium';
      const bytes = '3TB';
      const isOldPlan = false;

      mockTranslate.mockReturnValue(undefined);

      const result = getPlanTitle(planType, bytes, isOldPlan, mockTranslate);
      expect(result).toBe('3TB');
    });

    it('handles empty string titles by falling back to default', () => {
      const planType = 'basic';
      const bytes = '1TB';
      const isOldPlan = false;
      const mockDefaultTitle = 'Basic Default {{storage}}';

      mockTranslate
        .mockReturnValueOnce('') // primary returns empty string
        .mockReturnValueOnce(mockDefaultTitle);

      const result = getPlanTitle(planType, bytes, isOldPlan, mockTranslate);
      expect(result).toBe('Basic Default 1TB');
    });

    it('handles null titles by falling back to default', () => {
      const planType = 'basic';
      const bytes = '1TB';
      const isOldPlan = false;
      const mockDefaultTitle = 'Basic Default {{storage}}';

      mockTranslate
        .mockReturnValueOnce(null) // primary returns null
        .mockReturnValueOnce(mockDefaultTitle);

      const result = getPlanTitle(planType, bytes, isOldPlan, mockTranslate);
      expect(result).toBe('Basic Default 1TB');
    });
  });

  describe('Storage Replacement', () => {
    it('replaces multiple storage placeholders', () => {
      const mockTitle = '{{storage}} Plan with {{storage}} storage';
      mockTranslate.mockReturnValue(mockTitle);

      const result = getPlanTitle('premium', '2TB', false, mockTranslate);
      expect(result).toBe('2TB Plan with 2TB storage');
    });

    it('leaves titles without storage placeholders unchanged', () => {
      const mockTitle = 'Premium Plan';
      mockTranslate.mockReturnValue(mockTitle);

      const result = getPlanTitle('premium', '1TB', false, mockTranslate);
      expect(result).toBe('Premium Plan');
    });
  });

  describe('Edge Cases', () => {
    it('handles special characters in bytes', () => {
      const bytes = '1.5TB';
      const mockTitle = 'Plan {{storage}}';
      mockTranslate.mockReturnValue(mockTitle);

      const result = getPlanTitle('premium', bytes, false, mockTranslate);
      expect(result).toBe('Plan 1.5TB');
    });

    it('handles empty planType', () => {
      const mockTitle = 'Generic {{storage}} Plan';
      mockTranslate.mockReturnValue(mockTitle);

      const result = getPlanTitle('', '1TB', false, mockTranslate);

      expect(mockTranslate).toHaveBeenCalledWith('preferences.account.plans..plans.1TB.title');
      expect(result).toBe('Generic 1TB Plan');
    });
  });
});
