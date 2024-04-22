import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import UsageBar from '../components/Usage/UsageBar';
import { DriveProduct } from '../types/types';

const UsageContainer = ({
  className = '',
  planLimitInBytes,
  products,
}: Readonly<{
  className?: string;
  planLimitInBytes: number;
  products: DriveProduct[];
}>): JSX.Element => {
  const planUsage = useAppSelector((state: RootState) => state.plan.planUsage);

  products.sort((a, b) => b.usageInBytes - a.usageInBytes);

  const usedProducts = products.filter((product) => product.usageInBytes > 0);

  return (
    <div className={`${className} w-full space-y-6 `}>
      <UsageBar
        products={products}
        planUsage={planUsage}
        usedProducts={usedProducts}
        planLimitInBytes={planLimitInBytes}
      />
    </div>
  );
};

export default UsageContainer;
