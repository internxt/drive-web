interface UsageBarPercentagesParams {
  driveUsageBytes: number;
  backupsUsageBytes: number;
  spaceLimitBytes: number;
}

interface UsageBarPercentages {
  drivePercentage: number;
  backupPercentage: number;
  isOverLimit: boolean;
}

const toNonNegativeNumber = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0);

export const getUsageBarPercentages = ({
  driveUsageBytes,
  backupsUsageBytes,
  spaceLimitBytes,
}: UsageBarPercentagesParams): UsageBarPercentages => {
  const driveUsage = toNonNegativeNumber(driveUsageBytes);
  const backupsUsage = toNonNegativeNumber(backupsUsageBytes);
  const spaceLimit = toNonNegativeNumber(spaceLimitBytes);
  const totalUsage = driveUsage + backupsUsage;
  const isOverLimit = totalUsage > spaceLimit;

  if (totalUsage === 0) {
    return { drivePercentage: 0, backupPercentage: 0, isOverLimit };
  }

  const denominator = isOverLimit ? totalUsage : spaceLimit;

  return {
    drivePercentage: (driveUsage * 100) / denominator,
    backupPercentage: (backupsUsage * 100) / denominator,
    isOverLimit,
  };
};
