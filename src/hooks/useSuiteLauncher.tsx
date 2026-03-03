import {
  EnvelopeSimple,
  FolderSimple,
  Gauge,
  PaperPlaneTilt,
  Shield,
  Sparkle,
  VideoCamera,
} from '@phosphor-icons/react';
import { SuiteLauncherProps } from '@internxt/ui';
import { Service } from '@internxt/sdk/dist/drive/payments/types/tiers';
import { useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import desktopService from 'services/desktop.service';
import { store } from 'app/store';
import { envService } from 'services';

const MEET_URL = 'https://meet.internxt.com';
const SEND_URL = 'https://send.internxt.com';

export const useSuiteLauncher = () => {
  const { translate } = useTranslationContext();
  const userFeatures = useAppSelector((state) => state.user.userTierFeatures);

  const openSuite = (suite: {
    enabled: boolean;
    onOpenSuite: () => void;
    upgradeTitle: string;
    upgradeDescription: string;
  }) => {
    if (suite.enabled) {
      suite.onOpenSuite();
    } else {
      store.dispatch(
        uiActions.setCurrentUpgradePlanDialogInfo({
          title: suite.upgradeTitle,
          description: suite.upgradeDescription,
        }),
      );
      store.dispatch(uiActions.setIsUpgradePlanDialogOpen(true));
    }
  };

  const suiteArray: SuiteLauncherProps['suiteArray'] = [
    {
      icon: <FolderSimple />,
      title: 'Drive',
      onClick: () => {
        window.open(envService.getVariable('hostname'), '_self', 'noopener');
      },
      isMain: true,
    },
    {
      icon: <VideoCamera />,
      title: 'Meet',
      onClick: () =>
        openSuite({
          enabled: userFeatures?.[Service.Meet].enabled ?? false,
          onOpenSuite: () => window.open(MEET_URL, '_blank', 'noopener'),
          upgradeTitle: translate('modals.upgradePlanDialog.meet.title'),
          upgradeDescription: translate('modals.upgradePlanDialog.meet.description'),
        }),
      isLocked: !userFeatures?.[Service.Meet].enabled,
    },
    {
      icon: <EnvelopeSimple />,
      title: 'Mail',
      onClick: () => {},
      availableSoon: true,
      isLocked: !userFeatures?.[Service.Mail].enabled,
    },
    {
      icon: <PaperPlaneTilt />,
      title: 'Send',
      onClick: () => {
        window.open(SEND_URL, '_blank', 'noopener');
      },
    },
    {
      icon: <Gauge />,
      title: 'VPN',
      onClick: () =>
        openSuite({
          enabled: userFeatures?.[Service.Vpn].enabled ?? false,
          onOpenSuite: () =>
            window.open(
              'https://chromewebstore.google.com/detail/internxt-vpn-free-encrypt/dpggmcodlahmljkhlmpgpdcffdaoccni',
              '_blank',
              'noopener',
            ),
          upgradeTitle: translate('modals.upgradePlanDialog.vpn.title'),
          upgradeDescription: translate('modals.upgradePlanDialog.vpn.description'),
        }),
      isLocked: !userFeatures?.[Service.Vpn].enabled,
    },
    {
      icon: <Shield />,
      title: 'Antivirus',
      onClick: () =>
        openSuite({
          enabled: userFeatures?.[Service.Antivirus].enabled ?? false,
          onOpenSuite: () => {
            desktopService.openDownloadAppUrl(translate);
          },
          upgradeTitle: translate('modals.upgradePlanDialog.antivirus.title'),
          upgradeDescription: translate('modals.upgradePlanDialog.antivirus.description'),
        }),
      isLocked: !userFeatures?.[Service.Antivirus].enabled,
    },
    {
      icon: <Sparkle />,
      title: 'Cleaner',
      onClick: () =>
        openSuite({
          enabled: userFeatures?.[Service.Cleaner].enabled ?? false,
          onOpenSuite: () => {
            desktopService.openDownloadAppUrl(translate);
          },
          upgradeTitle: translate('modals.upgradePlanDialog.cleaner.title'),
          upgradeDescription: translate('modals.upgradePlanDialog.cleaner.description'),
        }),
      isLocked: !userFeatures?.[Service.Cleaner].enabled,
    },
  ];

  return {
    suiteArray,
  };
};
