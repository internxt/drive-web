import { useEffect } from 'react';
import { Fragment, useState } from 'react';
import * as Unicons from '@iconscout/react-unicons';

import './ProductItem.scss';
import i18n from '../../../i18n/services/i18n.service';
import numberService from '../../../core/services/number.service';
import screenService from '../../../core/services/screen.service';
import NumberInput from '../../../core/components/forms/inputs/NumberInput';
import { planSelectors } from '../../../store/slices/plan';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import BaseButton from '../../../core/components/Buttons/BaseButton';
import { ProductData, RenewalPeriod } from '../../types';
import { paymentThunks } from '../../../store/slices/payment';
import moneyService from '../../services/money.service';

interface ProductItemProps {
  product: ProductData;
  currentPlanId: string | undefined;
  isBuyButtonDisabled: boolean;
  isBusiness: boolean;
}

const ProductItem = (props: ProductItemProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const [isLgScreen, setIsLgScreen] = useState(screenService.isLg());
  const [teamMembersCount, setTeamMembersCount] = useState(2);
  const currentPriceId = useAppSelector((state) => state.payment.currentPriceId);
  const isCurrentProduct = currentPriceId === props.product.price.id;
  const isLifetime = props.product.renewalPeriod === RenewalPeriod.Lifetime;
  const priceMultiplier = props.product.metadata.is_drive ? 1 : teamMembersCount;
  const isPlanActive = useAppSelector(planSelectors.isPlanActive)(props.product.price.id);
  const isBuyButtonDisabled = props.isBuyButtonDisabled || isPlanActive;
  const monthlyAmountMultiplied = props.product.price.monthlyAmount * priceMultiplier;
  const monthlyAmountFormatted =
    (numberService.hasDecimals(monthlyAmountMultiplied)
      ? monthlyAmountMultiplied.toFixed(2)
      : monthlyAmountMultiplied.toFixed()) + moneyService.getCurrencySymbol(props.product.price.currency);
  const totalAmount = props.product.price.amount * priceMultiplier;
  const totalAmountFormatted =
    (numberService.hasDecimals(totalAmount) ? totalAmount.toFixed(2) : totalAmount.toFixed()) +
    moneyService.getCurrencySymbol(props.product.price.currency);
  const onBuyButtonClicked = async () => {
    if (props.product.metadata.is_drive) {
      dispatch(
        paymentThunks.checkoutThunk({
          product: props.product,
        }),
      );
    } else {
      dispatch(paymentThunks.teamsCheckoutThunk({ product: props.product, teamMembersCount }));
    }
  };
  const desktopBuyButtonLabel =
    isBuyButtonDisabled && isCurrentProduct ? i18n.get('general.loading.redirecting') : i18n.get('action.buy');
  const tabletBuyButtonLabel =
    isBuyButtonDisabled && isCurrentProduct
      ? i18n.get('general.loading.redirecting')
      : monthlyAmountFormatted + (isLifetime ? '' : '/' + i18n.get('general.time.month'));
  const sizeClassName = props.product.metadata.is_drive ? 'square' : '';

  useEffect(() => {
    setIsLgScreen(screenService.isLg());
  });

  const desktopTemplate = (
    <div className={`product-item desktop rounded-lg ${isPlanActive ? 'active' : ''}`}>
      <div
        className={`${
          isPlanActive ? 'visible' : 'invisible'
        } py-2 font-semibold bg-blue-60 text-white text-xs flex justify-center items-center rounded-t-lg`}
      >
        {i18n.get('drive.currentPlan')}
      </div>
      <div
        className={`${sizeClassName} flex flex-col justify-center text-neutral-700 p-6 border border-l-neutral-30 rounded-lg bg-white`}
      >
        {/* SIMPLE NAME */}
        <h4 className="mx-auto rounded-3xl px-4 py-1 bg-l-neutral-20 text-m-neutral-80 font-semibold mb-4 w-min">
          {props.product.metadata.simple_name}
        </h4>

        {/* MONTHLY AMOUNT */}
        <div className="flex justify-center items-center">
          <span className="text-3xl font-bold mr-2">{monthlyAmountFormatted}</span>
          {!isLifetime && <span className="h-fit">/{i18n.get('general.time.month')}</span>}
        </div>

        {/* TOTAL AMOUNT */}
        {props.product.metadata.is_teams ? (
          <div className="bg-l-neutral-10 border border-l-neutral-20 rounded-lg mt-6 mb-2 p-4">
            <NumberInput
              className="mb-2"
              initialValue={teamMembersCount}
              min={2}
              unitLabel="users"
              onChange={setTeamMembersCount}
            />

            <div className="w-full flex justify-center items-center">
              {isLifetime ? (
                <span className="text-xs text-m-neutral-100">{i18n.get('general.billing.oneTimePayment')}</span>
              ) : (
                <Fragment>
                  <span className="text-xs mr-1">{moneyService.getCurrencySymbol(props.product.price.currency)}</span>
                  <span className="mr-1">{totalAmount}</span>
                  <span className="text-xs text-m-neutral-100">
                    /{i18n.get(`general.renewalPeriod.${props.product.renewalPeriod}`).toLowerCase()}
                  </span>
                </Fragment>
              )}
            </div>
          </div>
        ) : (
          <span className="text-center text-xs text-m-neutral-80 mt-2 mb-4">
            {isLifetime
              ? i18n.get('general.billing.oneTimePayment')
              : i18n.get('general.billing.billedEachPeriod', {
                  price: totalAmountFormatted,
                  period: i18n.get(`general.renewalPeriod.${props.product.renewalPeriod}`).toLowerCase(),
                })}
          </span>
        )}
        <div />
        <BaseButton
          className="w-full primary font-semibold"
          disabled={isBuyButtonDisabled}
          onClick={onBuyButtonClicked}
        >
          {desktopBuyButtonLabel}
        </BaseButton>
      </div>
    </div>
  );
  const tabletTemplate = (
    <div className="product-item tablet">
      <div className="w-36">
        <div className={`${isPlanActive ? 'text-blue-60' : ''} flex`}>
          <span className="block text-xl font-bold mr-3">{props.product.metadata.simple_name}</span>
          {isPlanActive && <Unicons.UilCheck />}
        </div>

        <span className={`${isPlanActive ? 'text-blue-60' : 'text-m-neutral-80'} block text-xs`}>
          {isLifetime
            ? i18n.get('general.billing.oneTimePayment')
            : i18n.get('general.billing.billedEachPeriod', {
                price: totalAmountFormatted,
                period: i18n.get(`general.renewalPeriod.${props.product.renewalPeriod}`).toLowerCase(),
              })}
        </span>
      </div>

      {props.product.metadata.is_teams && (
        <NumberInput initialValue={teamMembersCount} min={2} unitLabel="users" onChange={setTeamMembersCount} />
      )}

      <BaseButton onClick={onBuyButtonClicked} className="primary font-semibold w-36" disabled={isBuyButtonDisabled}>
        {tabletBuyButtonLabel}
      </BaseButton>
    </div>
  );

  return isLgScreen ? desktopTemplate : tabletTemplate;
};

export default ProductItem;
