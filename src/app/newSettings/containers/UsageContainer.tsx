import { DriveProduct } from '../types/types';
import Usage from '../components/Usage/Usage';
import { Loader } from '@internxt/ui';

const UsageContainer = ({
  className = '',
  planUsage,
  planLimitInBytes,
  products,
}: Readonly<{
  className?: string;
  planUsage: number;
  planLimitInBytes: number;
  products: DriveProduct[];
}>): JSX.Element => {
  const driveProduct = products.find((product) => product.name === 'Drive');
  const backupsProduct = products.find((product) => product.name === 'Backups');
  const driveUsage = driveProduct ? driveProduct?.usageInBytes : 0;
  const backupsUsage = backupsProduct ? backupsProduct?.usageInBytes : 0;

  return (
    <div className={`${className} w-full space-y-6 `}>
      {products && planUsage >= 0 && planLimitInBytes ? (
        <Usage
          usedSpace={planUsage}
          spaceLimit={planLimitInBytes}
          driveUsage={driveUsage}
          backupsUsage={backupsUsage}
        />
      ) : (
        <div className="flex h-36 w-full items-center justify-center">
          <Loader classNameLoader="h-7 w-7 text-primary" />
        </div>
      )}
    </div>
  );
};

export default UsageContainer;
