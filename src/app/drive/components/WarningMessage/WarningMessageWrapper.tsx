import { connect, useDispatch } from 'react-redux';
import navigationService from '../../../core/services/navigation.service';
import { RootState } from '../../../store';
import { useAppSelector } from '../../../store/hooks';
import { planSelectors } from '../../../store/slices/plan';
import { uiActions } from '../../../store/slices/ui';
import workspacesSelectors from '../../../store/slices/workspaces/workspaces.selectors';
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
  const dispatch = useDispatch();
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);

  const onUpgradeButtonClicked = () => {
    navigationService.openPreferencesDialog({
      section: 'account',
      subsection: 'plans',
      workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
    });
    dispatch(uiActions.setIsPreferencesDialogOpen(true));
  };

  const isLimitReached = planUsage >= planLimit;
  const isLoading = isLoadingPlanLimit || isLoadingPlanUsage;
  const plansNotFetched = planUsage === 0 && planLimit === 0;
  const areNotNumbers =
    (planUsage !== 0 && !planUsage) || (planLimit !== 0 && !planLimit) || isNaN(planUsage) || isNaN(planLimit);

  if (plansNotFetched || areNotNumbers || !isLimitReached || isLoading) return <></>;

  return <WarningMessage onUpgradeButtonClicked={onUpgradeButtonClicked} />;
};

export default connect((state: RootState) => ({
  planUsage: planSelectors.planUsageToShow(state),
  planLimit: planSelectors.planLimitToShow(state),
  isLoadingPlanLimit: state.plan.isLoadingPlanLimit,
  isLoadingPlanUsage: state.plan.isLoadingPlanUsage,
}))(WarningMessageWrapper);
