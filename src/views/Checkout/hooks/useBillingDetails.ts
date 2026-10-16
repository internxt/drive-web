import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useState } from 'react';

interface UseBillingDetailsProps {
  userLocation?: string;
}

interface CustomerNameProps {
  companyName?: string;
  authenticatedUser?: UserSettings;
  email?: string;
}

export const useBillingDetails = ({ userLocation }: UseBillingDetailsProps) => {
  const [postalCode, setPostalCode] = useState('');

  const billingCountry = userLocation;
  const billingPostalCode = postalCode.trim() || undefined;

  const getCustomerName = ({ companyName, authenticatedUser, email }: CustomerNameProps) => {
    const authName = [authenticatedUser?.name, authenticatedUser?.lastname].filter(Boolean).join(' ').trim();
    const fallbackCustomerName = authName || authenticatedUser?.email || email;
    return companyName ?? fallbackCustomerName;
  };

  return {
    postalCode,
    billingCountry,
    billingPostalCode,
    getCustomerName,
    onPostalCodeChanges: setPostalCode,
  };
};
