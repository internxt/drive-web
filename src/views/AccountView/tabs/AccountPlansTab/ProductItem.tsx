import { useEffect } from 'react';
import { Fragment, useState } from 'react';

import BaseButton from '../../../../components/Buttons/BaseButton';
import { RenewalPeriod } from '../../../../models/enums';
import { ProductData } from '../../../../models/interfaces';
import i18n from '../../../../services/i18n.service';
import moneyService from '../../../../services/money.service';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { paymentThunks } from '../../../../store/slices/payment';

interface ProductItemProps {
  product: ProductData;
  currentPlanId: string | undefined;
  isBuyButtonDisabled: boolean;
  isBusiness: boolean;
}

const ProductItem = ({ product, isBuyButtonDisabled }: ProductItemProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const [teamMembersCount, setTeamMembersCount] = useState(2);
  const currentPriceId = useAppSelector((state) => state.payment.currentPriceId);
  const priceMultiplier = !teamMembersCount ? 1 : teamMembersCount * 0.5;
  const buttonLabel =
    isBuyButtonDisabled && currentPriceId === product.price.id
      ? i18n.get('general.loading.redirecting')
      : i18n.get('action.buy');
  const monthlyAmountFormatted =
    (product.price.monthlyAmount * priceMultiplier).toFixed(2) + moneyService.getCurrencySymbol(product.price.currency);
  const totalAmount = product.price.amount * priceMultiplier;
  const totalAmountFormatted = totalAmount.toFixed(2) + moneyService.getCurrencySymbol(product.price.currency);
  const onBuyButtonClicked = async () => {
    if (product.metadata.is_drive) {
      dispatch(
        paymentThunks.checkoutThunk({
          product,
        }),
      );
    } else {
      dispatch(paymentThunks.teamsCheckoutThunk({ product, teamMembersCount }));
    }
  };
  const isLifetime = product.renewalPeriod === RenewalPeriod.Lifetime;
  const sizeClassName = product.metadata.is_drive ? 'square' : '';

  // teamMembersCount validation
  useEffect(() => {
    setTeamMembersCount(!teamMembersCount || teamMembersCount < 2 ? 2 : teamMembersCount);
  }, [teamMembersCount]);

  return (
    <div
      className={`${sizeClassName} flex flex-col justify-center text-neutral-700 p-6 border border-l-neutral-30 rounded-lg`}
    >
      {/* SIMPLE NAME */}
      <h4 className="mx-auto rounded-3xl px-4 py-1 bg-l-neutral-20 text-m-neutral-80 font-semibold mb-4 w-min">
        {product.metadata.simple_name}
      </h4>

      {/* MONTHLY AMOUNT */}
      <div className="flex justify-center items-center">
        <span className="text-3xl font-bold mr-2">{monthlyAmountFormatted}</span>
        {!isLifetime && <span className="h-fit">/{i18n.get('general.time.month')}</span>}
      </div>

      {/* TOTAL AMOUNT */}
      {product.metadata.is_teams ? (
        <div className="bg-l-neutral-10 border border-l-neutral-20 rounded-lg mt-6 mb-2 p-4">
          <div className="relative flex items-center bg-white border border-l-neutral-30 rounded-lg mb-2">
            <button
              disabled={teamMembersCount <= 2}
              className="w-10 primary flex items-center justify-center font-semibold rounded-l-lg"
              onClick={() => setTeamMembersCount(teamMembersCount - 1)}
            >
              -
            </button>
            <div className="flex-grow flex justify-center py-2 px-3">
              <input
                type="number"
                min={2}
                className="w-6 mr-1 bg-white"
                value={teamMembersCount}
                onChange={(e) => setTeamMembersCount(parseInt(e.target.value))}
              />
              <span className="text-neutral-500">users</span>
            </div>
            <button
              className="w-10 primary flex items-center justify-center font-semibold rounded-r-lg"
              onClick={() => setTeamMembersCount(teamMembersCount + 1)}
            >
              +
            </button>
          </div>

          <div className="w-full flex justify-center items-center">
            {isLifetime ? (
              <span className="text-xs text-m-neutral-100">{i18n.get('general.billing.oneTimePayment')}</span>
            ) : (
              <Fragment>
                <span className="text-xs mr-1">{moneyService.getCurrencySymbol(product.price.currency)}</span>
                <span className="mr-1">{totalAmount.toFixed()}</span>
                <span className="text-xs text-m-neutral-100">
                  /{i18n.get('general.renewalPeriod.annually').toLowerCase()}
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
                period: i18n.get(`general.renewalPeriod.${product.renewalPeriod}`).toLowerCase(),
              })}
        </span>
      )}
      <div />
      <BaseButton className="w-full primary font-semibold" disabled={isBuyButtonDisabled} onClick={onBuyButtonClicked}>
        {buttonLabel}
      </BaseButton>
    </div>
  );
};

export default ProductItem;
