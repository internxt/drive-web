import UilAngleUp from '@iconscout/react-unicons/icons/uil-angle-up';
import UilAngleDown from '@iconscout/react-unicons/icons/uil-angle-down';

import i18n from 'app/i18n/services/i18n.service';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';

import './ReferralsWidget.scss';
import { userSelectors } from 'app/store/slices/user';
import { referralsThunks } from 'app/store/slices/referrals';
import usersReferralsService from 'app/referrals/services/users-referrals.service';
import { sessionSelectors } from 'app/store/slices/session/session.selectors';
import sizeService from 'app/drive/services/size.service';

const ReferralsWidget = (props: { className?: string }): JSX.Element => {
  const dispatch = useAppDispatch();
  const isCollapsed = useAppSelector((state) => state.ui.isReferralsWidgetCollapsed);
  const setIsCollapsed = (value) => dispatch(uiActions.setIsReferralsWidgetCollapsed(value));
  const isLoadingReferrals = useAppSelector((state) => state.referrals.isLoading);
  const hasReferralsProgram = useAppSelector(userSelectors.hasReferralsProgram);
  const referrals = useAppSelector((state) => state.referrals.list);
  const creditSum = referrals.reduce((t, x) => t + x.credit * x.steps, 0);
  const currentCredit = referrals.reduce((t, x) => x.completedSteps * x.credit + t, 0);
  const isTeam = useAppSelector(sessionSelectors.isTeam);
  const isWidgetHidden = !hasReferralsProgram || isLoadingReferrals || isTeam;
  const onReferralItemClicked = (referral) => {
    !referral.isCompleted && dispatch(referralsThunks.executeUserReferralActionThunk({ referralKey: referral.key }));
  };
  const referralsList = referrals.map((referral) => (
    <div
      key={referral.key}
      className={`${referral.isCompleted ? 'active' : ''} ${
        usersReferralsService.hasClickAction(referral.key) && !referral.isCompleted ? 'interactive' : ''
      } referral-item flex items-center mb-4`}
      onClick={() => onReferralItemClicked(referral)}
    >
      <div
        className="referral-item-bullet flex-none h-4 w-8 py-1 px-2\
       text-xs rounded-lg bg-neutral-30 flex justify-center items-center mr-2"
      >
        <span>{sizeService.bytesToString(referral.credit * referral.steps)}</span>
      </div>
      <span className="referral-item-label text-sm">
        {i18n.get(`referrals.items.${referral.key}`, {
          steps: referral.steps,
          completedSteps: referral.completedSteps,
        })}
      </span>
    </div>
  ));
  const onCollapseButtonClicked = () => {
    setIsCollapsed(!isCollapsed);
  };

  return isWidgetHidden || referralsList.length === 0 ? (
    <div className="flex-grow"></div>
  ) : (
    <div
      className={`flex flex-col py-6 border-t border-b border-neutral-30 bg-neutral-10 overflow-y-hidden  ${
        isCollapsed ? '' : 'h-full max-h-120'
      } ${props.className || ''}`}
    >
      {/* HEADER */}
      <div className="flex items-center px-6">
        <div className="mr-3">
          <span className="font-semibold">
            {i18n.get('referrals.rewards.title', { creditSum: sizeService.bytesToString(creditSum) })}
          </span>
          <p className="text-supporting-2 m-0">
            <span className="text-green-50">
              {i18n.get('referrals.rewards.progress', { currentCredit: sizeService.bytesToString(currentCredit) })}
            </span>
            <span className="text-neutral-500">
              {' ' + i18n.get('referrals.rewards.limit', { creditSum: sizeService.bytesToString(creditSum) })}
            </span>
          </p>
        </div>
        <div className="flex-none rounded-full bg-neutral-30 w-4 h-4 cursor-pointer" onClick={onCollapseButtonClicked}>
          {isCollapsed ? (
            <UilAngleUp className="text-neutral-100 w-full h-full" />
          ) : (
            <UilAngleDown className="text-neutral-100 w-full h-full" />
          )}
        </div>
      </div>

      {/* LIST */}
      {!isCollapsed && (
        <div className="mt-8 mb-4 overflow-y-auto">
          <div className="px-6">{referralsList}</div>
        </div>
      )}

      {/* TERMS AND CONDITIONS */}
      {!isCollapsed && (
        <div className="px-6">
          <a
            className="text-xs text-neutral-60 hover:text-neutral-100"
            target="_blank"
            href="https://help.internxt.com/"
            rel="noopener noreferrer"
          >
            {i18n.get('actions.moreInfo')}
          </a>
        </div>
      )}
    </div>
  );
};

export default ReferralsWidget;
