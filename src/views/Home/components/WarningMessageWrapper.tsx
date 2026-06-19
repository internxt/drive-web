import { Fragment, useState } from 'react';
import { connect } from 'react-redux';
import { RootState } from 'app/store';
import { planSelectors } from 'app/store/slices/plan';
import { UsageWarningBanner } from '@internxt/ui';
import { bytesToString } from 'app/drive/services/size.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useTaskManagerGetNotifications } from 'app/tasks/hooks';
import { TaskStatus, TaskType } from 'app/tasks/types';

type UsageWarning = 'lowWarning' | 'midWarning' | 'highWarning';

interface StageConfig {
  key: UsageWarning;
  threshold: number;
  cooldownDays: number;
  barClassName: string;
}

const STAGES: StageConfig[] = [
  { key: 'lowWarning', threshold: 60, cooldownDays: 7, barClassName: 'bg-yellow-60' },
  { key: 'midWarning', threshold: 80, cooldownDays: 3, barClassName: 'bg-orange-60' },
  { key: 'highWarning', threshold: 95, cooldownDays: 3, barClassName: 'bg-danger' },
];

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DISMISSALS_STORAGE_KEY = 'storageWarningBannerDismissals';
const UPLOAD_IN_PROGRESS_STATUSES = [
  TaskStatus.Pending,
  TaskStatus.Encrypting,
  TaskStatus.InProcess,
  TaskStatus.Paused,
];

type Dismissals = Partial<Record<UsageWarning, number>>;

const readDismissals = (): Dismissals => {
  try {
    const raw = localStorage.getItem(DISMISSALS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

const writeDismissal = (stageKey: UsageWarning, dismissedAt: number): void => {
  try {
    const dismissals = readDismissals();
    dismissals[stageKey] = dismissedAt;
    localStorage.setItem(DISMISSALS_STORAGE_KEY, JSON.stringify(dismissals));
  } catch {
    //
  }
};

const isStageInCooldown = (stage: StageConfig, dismissals: Dismissals, now: number): boolean => {
  const dismissedAt = dismissals[stage.key];
  if (!dismissedAt) return false;
  return now < dismissedAt + stage.cooldownDays * DAY_IN_MS;
};

const renderDescriptionLine = (line: string): JSX.Element => (
  <>
    {line
      .split('**')
      .map((segment, index) =>
        index % 2 === 1 ? (
          <strong key={segment + index}>{segment}</strong>
        ) : (
          <Fragment key={segment + index}>{segment}</Fragment>
        ),
      )}
  </>
);

type WarningMessageWrapperProps = {
  planLimit: number;
  planUsage: number;
  isLoadingPlanLimit: boolean;
  isLoadingPlanUsage: boolean;
  isFreeUser: boolean;
};

const WarningMessageWrapper = ({
  planLimit,
  planUsage,
  isLoadingPlanLimit,
  isLoadingPlanUsage,
  isFreeUser,
}: WarningMessageWrapperProps): JSX.Element => {
  const { translate } = useTranslationContext();

  const [sessionDismissedStage, setSessionDismissedStage] = useState<UsageWarning | null>(null);

  const uploadNotifications = useTaskManagerGetNotifications({ status: UPLOAD_IN_PROGRESS_STATUSES });
  const isUploading = uploadNotifications.some(
    (notification) => notification.action === TaskType.UploadFile || notification.action === TaskType.UploadFolder,
  );

  const onUpgradeButtonClicked = () => {
    window.open('https://internxt.com/specialoffer', '_blank', 'noopener,noreferrer');
  };

  const isLoading = isLoadingPlanLimit || isLoadingPlanUsage;
  const plansNotFetched = planUsage === 0 && planLimit === 0;
  const areNotValidNumbers =
    !Number.isFinite(planUsage) || !Number.isFinite(planLimit) || planLimit <= 0 || planUsage < 0;

  if (!isFreeUser || isLoading || plansNotFetched || areNotValidNumbers || isUploading) return <></>;

  const usedPercentage = (planUsage / planLimit) * 100;

  const reachedStage = [...STAGES].reverse().find((stage) => usedPercentage >= stage.threshold);
  if (!reachedStage) return <></>;

  const now = Date.now();
  const dismissals = readDismissals();

  const isHiddenThisSession = sessionDismissedStage === reachedStage.key;
  if (isHiddenThisSession || isStageInCooldown(reachedStage, dismissals, now)) return <></>;

  const onCloseButtonClick = () => {
    writeDismissal(reachedStage.key, Date.now());
    setSessionDismissedStage(reachedStage.key);
  };

  const baseKey = `modals.reachingUsageBanner.${reachedStage.key}`;
  const description = (
    <div className="flex flex-col gap-1">
      <span>{renderDescriptionLine(translate(`${baseKey}.descriptionLabelLine1`))}</span>
      <span>{renderDescriptionLine(translate(`${baseKey}.descriptionLabelLine2`))}</span>
    </div>
  );

  const barPercentage = Math.min(Math.ceil(usedPercentage), 100);

  return (
    <UsageWarningBanner
      title={translate(`${baseKey}.title`)}
      description={description}
      usage={bytesToString(planUsage)}
      limit={bytesToString(planLimit)}
      percentage={barPercentage}
      upgradeLabel={translate('modals.reachingUsageBanner.cta')}
      closeButtonLabel={translate('modals.reachingUsageBanner.close')}
      onUpgradeClick={onUpgradeButtonClicked}
      onCloseButtonClick={onCloseButtonClick}
      barClassName={reachedStage.barClassName}
      isLoading={isLoading}
    />
  );
};

export default connect((state: RootState) => ({
  planUsage: planSelectors.planUsageToShow(state),
  planLimit: planSelectors.planLimitToShow(state),
  isLoadingPlanLimit: state.plan.isLoadingPlanLimit,
  isLoadingPlanUsage: state.plan.isLoadingPlanUsage,
  isFreeUser: planSelectors.subscriptionToShow(state)?.type === 'free',
}))(WarningMessageWrapper);
