import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import {
  FolderSimple,
  VideoCamera,
  EnvelopeSimple,
  PaperPlaneTilt,
  Gauge,
  Shield,
  Sparkle,
} from '@phosphor-icons/react';
import { SuiteLauncher, SuiteLauncherProps } from '@internxt/ui';
import desktopService from 'services/desktop.service';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { Service } from '@internxt/sdk/dist/drive/payments/types/tiers';
import { uiActions } from 'app/store/slices/ui';

interface SuitePopoverProps {
  className?: string;
}

export default function SuitePopover({ className = '' }: Readonly<SuitePopoverProps>): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
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
      dispatch(
        uiActions.setCurrentUpgradePlanDialogInfo({
          title: suite.upgradeTitle,
          description: suite.upgradeDescription,
        }),
      );
      dispatch(uiActions.setIsUpgradePlanDialogOpen(true));
    }
  };

  const suiteArray: SuiteLauncherProps['suiteArray'] = [
    {
      icon: <FolderSimple />,
      title: 'Drive',
      onClick: () => {
        window.open('https://drive.internxt.com', '_self', 'noopener');
      },
      isMain: true,
    },
    {
      icon: <VideoCamera />,
      title: 'Meet',
      onClick: () =>
        openSuite({
          enabled: userFeatures?.[Service.Meet].enabled ?? false,
          onOpenSuite: () => window.open('https://meet.internxt.com', '_blank', 'noopener'),
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
        window.open('https://send.internxt.com', '_blank', 'noopener');
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

  return (
    <SuiteLauncher
      className={className}
      suiteArray={suiteArray}
      soonText={translate('modals.upgradePlanDialog.soonBadge')}
    />
  );
}
