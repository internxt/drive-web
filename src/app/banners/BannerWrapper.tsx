import localStorageService, { STORAGE_KEYS } from 'app/core/services/local-storage.service';
import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import { PlanState } from 'app/store/slices/plan';
import { userSelectors } from 'app/store/slices/user';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import SummerBanner from './SummerBanner';

const BannerWrapper = ({ showBanner, onCloseBanner }) => {
  return <SummerBanner showBanner={showBanner} onClose={onCloseBanner} />;
};

export default BannerWrapper;
