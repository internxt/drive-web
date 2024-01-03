import { connect } from 'react-redux';
import { RootState } from '../../../store';
import { planSelectors } from '../../../store/slices/plan';
import { WarningMessage } from './WarningMessage';

type WarningMessageWrapperProps = {
  planLimit: number;
  planUsage: number;
  isLoadingPlanLimit: boolean;
  isLoadingPlanUsage: boolean;
};

const WarningMessageWrapper = ({
  planLimit,
  planUsage,
  isLoadingPlanLimit,
  isLoadingPlanUsage,
}: WarningMessageWrapperProps): JSX.Element => {
  const isLimitReached = planUsage >= planLimit;
  const isLoading = isLoadingPlanLimit || isLoadingPlanUsage;
  const areNotNumbers =
    (planUsage !== 0 && !planUsage) || (planLimit !== 0 && !planLimit) || isNaN(planUsage) || isNaN(planLimit);

  if (areNotNumbers || !isLimitReached || isLoading) return <></>;

  return <WarningMessage />;
};

export default connect((state: RootState) => ({
  planUsage: state.plan.planUsage,
  planLimit: planSelectors.planLimitToShow(state),
  isLoadingPlanLimit: state.plan.isLoadingPlanLimit,
  isLoadingPlanUsage: state.plan.isLoadingPlanUsage,
}))(WarningMessageWrapper);
