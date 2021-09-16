import React from 'react';
import { TwoFactorAuthStep } from '../../../../../../models/enums';
import TwoFactorAuthBackupKeyStep from './TwoFactorAuthBackupKeyStep';
import TwoFactorAuthDownloadStep from './TwoFactorAuthDownloadStep';
import TwoFactorAuthEnableStep from './TwoFactorAuthEnableStep';
import TwoFactorAuthQRStep from './TwoFactorAuthQRStep';

export interface TwoFactorAuthStepProps {
  qr: string;
  backupKey: string;
  setHas2FA: React.Dispatch<React.SetStateAction<boolean>>;
}

const activateTwoFactorAuthSteps = [
  {
    id: TwoFactorAuthStep.Download,
    component: TwoFactorAuthDownloadStep,
  },
  {
    id: TwoFactorAuthStep.QR,
    component: TwoFactorAuthQRStep,
  },
  {
    id: TwoFactorAuthStep.BackupKey,
    component: TwoFactorAuthBackupKeyStep,
  },
  {
    id: TwoFactorAuthStep.Enable,
    component: TwoFactorAuthEnableStep,
  },
];

export default activateTwoFactorAuthSteps;
