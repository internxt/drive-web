import { Fragment } from 'react';
import { connect } from 'react-redux';
import { RootState } from 'app/store';
import { planSelectors } from 'app/store/slices/plan';
import { UsageWarningBanner } from '@internxt/ui';
import { bytesToString } from 'app/drive/services/size.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { openUpgradeSpecialOffer, REACHING_USAGE_BANNER_TRANSLATION_KEY } from 'app/store/slices/plan/storageWarning';
import { useStorageWarningBanner } from 'views/Home/hooks/useStorageWarningBanner';

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

const WarningMessageWrapper = (props: WarningMessageWrapperProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const banner = useStorageWarningBanner(props);

  if (!banner) return <></>;

  const { reachedStage, usedPercentage, onCloseButtonClick } = banner;
  const { planUsage, planLimit } = props;

  const baseKey = `${REACHING_USAGE_BANNER_TRANSLATION_KEY}.${reachedStage.key}`;
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
      upgradeLabel={translate(`${REACHING_USAGE_BANNER_TRANSLATION_KEY}.cta`)}
      closeButtonLabel={translate(`${REACHING_USAGE_BANNER_TRANSLATION_KEY}.close`)}
      onUpgradeClick={openUpgradeSpecialOffer}
      onCloseButtonClick={onCloseButtonClick}
      barClassName={reachedStage.barClassName}
      isLoading={false}
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
