import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { userSelectors } from 'app/store/slices/user';
import { referralsThunks } from 'app/store/slices/referrals';
import usersReferralsService from 'app/referrals/services/users-referrals.service';
import { sessionSelectors } from 'app/store/slices/session/session.selectors';
import sizeService from 'app/drive/services/size.service';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const ReferralsWidget = (props: { className?: string }): JSX.Element => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isCollapsed = useAppSelector((state) => state.ui.isReferralsWidgetCollapsed);
  const setIsCollapsed = (value) => dispatch(uiActions.setIsReferralsWidgetCollapsed(value));
  const isLoadingReferrals = useAppSelector((state) => state.referrals.isLoading);
  const hasReferralsProgram = useAppSelector(userSelectors.hasReferralsProgram);
  const referrals = useAppSelector((state) => state.referrals.list);
  const creditSum = referrals.reduce((translate, x) => translate + x.credit * x.steps, 0);
  const currentCredit = referrals.reduce((translate, x) => x.completedSteps * x.credit + translate, 0);
  const isTeam = useAppSelector(sessionSelectors.isTeam);
  const completedReferrals = referrals.every((referral) => referral.isCompleted === true);
  const isWidgetHidden = !hasReferralsProgram || isLoadingReferrals || isTeam || completedReferrals;

  const onCollapseButtonClicked = () => {
    setIsCollapsed(!isCollapsed);
  };

  const onReferralItemClicked = (referral) => {
    !referral.isCompleted && dispatch(referralsThunks.executeUserReferralActionThunk({ referralKey: referral.key }));
  };

  const referralsList = referrals.map((referral) => (
    <div
      key={referral.key}
      className={` ${
        usersReferralsService.hasClickAction(referral.key) && !referral.isCompleted ? 'cursor-pointer' : ''
      } flex items-center`}
      onClick={() => onReferralItemClicked(referral)}
    >
      <div
        className={`flex h-5 w-10
       flex-none justify-center rounded-lg text-xs font-medium ${
         referral.isCompleted ? 'bg-green/10 text-green-dark' : 'bg-gray-5 text-gray-60'
       }`}
      >
        <p className="leading-5">{sizeService.bytesToString(referral.credit * referral.steps)}</p>
      </div>
      <span className={`ml-2 text-sm ${referral.isCompleted ? 'text-gray-40' : 'text-gray-80'}`}>
        {translate(`referrals.items.${referral.key}`, {
          steps: referral.steps,
          completedSteps: referral.completedSteps,
        })}
      </span>
    </div>
  ));

  return isWidgetHidden || referralsList.length === 0 ? (
    <div className="grow"></div>
  ) : (
    <div className="flex grow flex-col justify-end pt-8">
      <div
        className={`flex flex-col overflow-y-hidden rounded-xl border border-gray-10 p-5 shadow-subtle dark:bg-gray-1 ${
          props.className || ''
        }`}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="">
            <span className="font-medium text-gray-80">
              {translate('referrals.rewards.title', { creditSum: sizeService.bytesToString(creditSum) })}
            </span>
            <p className="text-xs font-medium">
              <span className="text-green-dark">
                {translate('referrals.rewards.progress', { currentCredit: sizeService.bytesToString(currentCredit) }) +
                  ' ' +
                  translate('referrals.rewards.limit', { creditSum: sizeService.bytesToString(creditSum) })}
              </span>
            </p>
          </div>
          <div className="cursor-pointer text-gray-40" onClick={onCollapseButtonClicked}>
            {isCollapsed ? <CaretUp size={20} className="" /> : <CaretDown size={20} className="" />}
          </div>
        </div>

        {/* LIST */}
        {!isCollapsed && <div className="mt-6 space-y-3 overflow-y-auto">{referralsList}</div>}

        {/* TERMS AND CONDITIONS */}
        {!isCollapsed && (
          <a
            className="mt-7 text-xs font-medium text-gray-40 no-underline hover:text-gray-50"
            target="_blank"
            href="https://help.internxt.com/"
            rel="noopener noreferrer"
          >
            {translate('actions.moreInfo')}
          </a>
        )}
      </div>
    </div>
  );
};

export default ReferralsWidget;
