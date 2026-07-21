import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { useEffect, useState } from 'react';
import { POSTAL_CODE_REQUIRED_COUNTRIES } from '../constants';
import { AddressProvider } from '../types/checkout.types';
import { PaymentType } from '../types';

interface FetchSelectedPlanPayload {
  priceId: string;
  promotionCode?: string;
  postalCode?: string;
  country?: string;
  currency?: string;
}

interface UseBillingDetailsProps {
  initialUserName?: string;
  userLocation?: string;
  promotionCode?: string;
  selectedPlan?: PriceWithTax;
  fetchSelectedPlan: (payload: FetchSelectedPlanPayload) => Promise<PriceWithTax>;
}

const TAX_RECALCULATION_DEBOUNCE_MS = 500;

export const useBillingDetails = ({
  initialUserName,
  userLocation,
  promotionCode,
  selectedPlan,
  fetchSelectedPlan,
}: UseBillingDetailsProps) => {
  const [address, setAddress] = useState<AddressProvider>();
  const [userName, setUserName] = useState(initialUserName ?? '');
  const [postalCode, setPostalCode] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('eur');
  const [currencyType, setCurrencyType] = useState<PaymentType>();

  const isPostalCodeRequired = POSTAL_CODE_REQUIRED_COUNTRIES.includes(userLocation ?? '');

  useEffect(() => {
    if (!selectedPlan?.price?.id || !selectedPlan?.price?.currency) {
      return;
    }

    const billingCountry = address?.country ?? userLocation;
    const billingPostalCode = address?.postal_code ?? postalCode.trim();

    if (!billingCountry || !billingPostalCode) {
      return;
    }

    const debounceTimer = setTimeout(() => {
      fetchSelectedPlan({
        priceId: selectedPlan.price.id,
        currency: selectedPlan.price.currency,
        promotionCode: promotionCode ?? undefined,
        postalCode: billingPostalCode,
        country: billingCountry,
      });
    }, TAX_RECALCULATION_DEBOUNCE_MS);

    return () => clearTimeout(debounceTimer);
  }, [address?.country, address?.postal_code, postalCode, selectedPlan?.price?.id, selectedPlan?.price?.currency]);

  const onUserAddressChanges = (newAddress: AddressProvider) => {
    setAddress(newAddress);
  };

  const onUserNameChanges = (newUserName: string) => {
    setUserName(newUserName);
  };

  const onCurrencyTypeChanges = (newCurrencyType: PaymentType) => {
    setCurrencyType(newCurrencyType);
  };

  return {
    address,
    userName,
    postalCode,
    selectedCurrency,
    currencyType,
    isPostalCodeRequired,
    onUserAddressChanges,
    onUserNameChanges,
    onCurrencyTypeChanges,
    onCurrencyChange: setSelectedCurrency,
    onPostalCodeChanges: setPostalCode,
  };
};
