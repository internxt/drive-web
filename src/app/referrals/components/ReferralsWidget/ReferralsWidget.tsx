import { useState } from 'react';
import UilAngleUp from '@iconscout/react-unicons/icons/uil-angle-up';
import UilAngleDown from '@iconscout/react-unicons/icons/uil-angle-down';

import i18n from 'app/i18n/services/i18n.service';

import './ReferralsWidget.scss';

const ReferralsWidget = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const referrals = [
    { id: 1, credit: 2, title: 'Create an account' },
    { id: 2, credit: 1, title: 'Install mobile app and upload a file' },
    { id: 3, credit: 1, title: 'Share a file via link' },
    { id: 4, credit: 1, title: 'Subscribe to newsletter' },
    { id: 5, credit: 1, title: 'Install desktop app and upload a file' },
    { id: 6, credit: 4, title: 'Invite 4 friends' },
  ];
  const referralsList = referrals.map((referral) => (
    <div key={referral.id} className="referral-item flex items-center mb-4">
      <div className="referral-item-bullet flex-none h-4 w-8 py-1 px-2 text-xs rounded-lg bg-l-neutral-30 flex justify-center items-center mr-2">
        <span className="text-m-neutral-100">{`${referral.credit}GB`}</span>
      </div>
      <span className="text-neutral-500 text-sm">{referral.title}</span>
    </div>
  ));
  const onCollapseButtonClicked = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="p-6 border-t border-b border-l-neutral-30 bg-l-neutral-10">
      {/* HEADER */}
      <div className="flex items-center">
        <div className="mr-3">
          <span className="font-semibold">{i18n.get('referrals.rewards.title')}</span>
          <p className="text-supporting-2 m-0">
            <span className="text-green-50">{i18n.get('referrals.rewards.progress', { progress: 0 })}</span>
            <span className="text-neutral-500">{' ' + i18n.get('referrals.rewards.limit')}</span>
          </p>
        </div>
        <div className="flex-none rounded-1/2 bg-l-neutral-30 w-4 h-4 cursor-pointer" onClick={onCollapseButtonClicked}>
          {isCollapsed ? (
            <UilAngleDown className="text-m-neutral-100 w-full h-full" />
          ) : (
            <UilAngleUp className="text-m-neutral-100 w-full h-full" />
          )}
        </div>
      </div>

      {/* LIST */}
      {!isCollapsed && <div className="mt-8 mb-4">{referralsList}</div>}

      {/* TERMS AND CONDITIONS */}
      {!isCollapsed && (
        <div>
          <a
            className="text-xs text-m-neutral-60 hover:text-m-neutral-100"
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
