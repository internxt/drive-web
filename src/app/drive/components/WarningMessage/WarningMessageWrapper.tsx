import { connect } from 'react-redux';
import { RootState } from '../../../store';
import { planSelectors } from '../../../store/slices/plan';
import { WarningMessage } from './WarningMessage';

const WarningMessageWrapper = ({ planLimit, planUsage }: { planLimit: number; planUsage: number }): JSX.Element => {
  const isLimitReached = planUsage >= planLimit;

  if (!isLimitReached) return <></>;

  return <WarningMessage />;
};

export default connect((state: RootState) => ({
  planUsage: state.plan.planUsage,
  planLimit: planSelectors.planLimitToShow(state),
}))(WarningMessageWrapper);
