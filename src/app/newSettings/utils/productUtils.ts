import { t } from 'i18next';
import { UsageDetailsProps } from '../../drive/services/usage.service';
import UsageDetails from '../../shared/components/UsageDetails';

const getProductCaptions = (usageDetails: UsageDetailsProps | null) => {
  const products: Parameters<typeof UsageDetails>[0]['products'] | null = [
    {
      name: t('sideNav.drive'),
      usageInBytes: usageDetails?.drive ?? 0,
      color: 'primary',
    },
    {
      name: t('views.account.tabs.account.view.backups'),
      usageInBytes: usageDetails?.backups ?? 0,
      color: 'indigo',
    },
  ];
  return products;
};

export { getProductCaptions };
