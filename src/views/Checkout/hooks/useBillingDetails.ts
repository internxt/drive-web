import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useState } from 'react';
import { POSTAL_CODE_REQUIRED_COUNTRIES } from '../constants';
import { AddressProvider } from '../types/checkout.types';

interface UseBillingDetailsProps {
  user?: UserSettings;
  userLocation?: string;
}

interface CustomerNameProps {
  companyName?: string;
  authenticatedUser?: UserSettings;
  email?: string;
}

export const useBillingDetails = ({ user, userLocation }: UseBillingDetailsProps) => {
  const [address, setAddress] = useState<AddressProvider>();
  const [userName, setUserName] = useState(user?.name ?? '');
  const [postalCode, setPostalCode] = useState('');

  const isPostalCodeRequired = POSTAL_CODE_REQUIRED_COUNTRIES.includes(userLocation ?? '');

  const billingCountry = address?.country ?? userLocation;
  const billingPostalCode = address?.postal_code ?? (postalCode.trim() || undefined);

  const isCryptoAddressIncomplete =
    !userName.trim() || !address?.line1 || !address?.city || !address?.country || !address?.postal_code;

  const getCustomerName = ({ companyName, authenticatedUser, email }: CustomerNameProps) => {
    const authName = [authenticatedUser?.name, authenticatedUser?.lastname].filter(Boolean).join(' ').trim();
    const fallbackCustomerName = userName.trim() || authName || authenticatedUser?.email || email;
    return companyName ?? fallbackCustomerName;
  };

  return {
    address,
    userName,
    postalCode,
    isPostalCodeRequired,
    isCryptoAddressIncomplete,
    billingCountry,
    billingPostalCode,
    getCustomerName,
    onUserAddressChanges: setAddress,
    onUserNameChanges: setUserName,
    onPostalCodeChanges: setPostalCode,
  };
};
