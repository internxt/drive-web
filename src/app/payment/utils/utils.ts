type TranslateFunction = (key: string, options?: { returnObjects?: boolean }) => string | string[] | undefined;

type TranslateListFunction = (key: string, options?: { returnObjects?: boolean }) => string[] | undefined;

const STORAGE_PLACEHOLDER = '{{storage}}';
const VPN_PLACEHOLDER = '{{VPN}}';
const LARGE_STORAGE_SIZE = '5TB';

export const getPlanFeatures = (
  planType: string,
  bytes: string,
  isOldPlan: boolean,
  translateList: TranslateListFunction,
): string[] => {
  if (isOldPlan) {
    return getOldPlanFeatures(planType, bytes, translateList);
  }

  return getNewPlanFeatures(planType, bytes, translateList);
};

const getOldPlanFeatures = (planType: string, bytes: string, translateList: TranslateListFunction): string[] => {
  const featureKeys = translateList(`preferences.account.plans.${planType}.plans.default.features`, {
    returnObjects: true,
  });

  if (!featureKeys) {
    return [];
  }

  return featureKeys.map((feature: string) => feature.replace(new RegExp(STORAGE_PLACEHOLDER, 'g'), bytes));
};

const getNewPlanFeatures = (planType: string, bytes: string, translateList: TranslateListFunction): string[] => {
  const baseFeatures = translateList(`preferences.account.plans.${planType}.baseFeatures`, { returnObjects: true });

  const vpnFeatures = translateList(`preferences.account.plans.${planType}.plans.${bytes}.features`, {
    returnObjects: true,
  });

  if (!baseFeatures) {
    return [];
  }

  const vpnFeatureString = vpnFeatures?.join(', ') || '';

  return baseFeatures.map((feature: string) => feature.replace(new RegExp(VPN_PLACEHOLDER, 'g'), vpnFeatureString));
};

export const getPlanCommingFeatures = (
  planType: string,
  bytes: string,
  isOldPlan: boolean,
  translateList: TranslateListFunction,
): string[] => {
  const result =
    translateList(`preferences.account.plans.${planType}.plans.${bytes}.comingSoonFeatures`, {
      returnObjects: true,
    }) ?? [];

  return !isOldPlan ? result : [];
};

export const getPlanTitle = (
  planType: string,
  bytes: string,
  isOldPlan: boolean,
  translate: TranslateFunction,
): string => {
  const titleKey = buildTitleKey(planType, bytes, isOldPlan);
  let productLabel = translate(titleKey) as string;

  if (productLabel) {
    productLabel = productLabel.replace(new RegExp(STORAGE_PLACEHOLDER, 'g'), bytes);
    return productLabel;
  }

  return getFallbackTitle(planType, bytes, translate);
};

const buildTitleKey = (planType: string, bytes: string, isOldPlan: boolean): string => {
  const planIdentifier = isOldPlan ? 'default' : bytes;
  const titleType = bytes === LARGE_STORAGE_SIZE ? 'oldTitle' : 'title';

  return `preferences.account.plans.${planType}.plans.${planIdentifier}.${titleType}`;
};

const getFallbackTitle = (planType: string, bytes: string, translate: TranslateFunction): string => {
  const defaultTitle = translate(`preferences.account.plans.${planType}.plans.default.title`) as string;

  if (defaultTitle) {
    return defaultTitle.replace(new RegExp(STORAGE_PLACEHOLDER, 'g'), bytes);
  }

  return bytes;
};
