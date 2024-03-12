import { useEffect, useRef, useState } from 'react';

import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import { bytesToString } from '../../drive/services/size.service';
import { useTranslationContext } from '../../i18n/provider/TranslationProvider';
import Tooltip from '../../shared/components/Tooltip';

export default function UsageDetails({
  className = '',
  planLimitInBytes,
  products,
}: Readonly<{
  className?: string;
  planLimitInBytes: number;
  products: {
    name: string;
    usageInBytes: number;
    color: 'red' | 'orange' | 'yellow' | 'green' | 'pink' | 'indigo' | 'primary' | 'gray';
  }[];
}>): JSX.Element {
  const { translate } = useTranslationContext();
  const [barWidth, setBarWidth] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;

    if (bar) {
      const listener = () => {
        setBarWidth(bar.getBoundingClientRect().width);
      };
      bar.addEventListener('resize', listener);

      listener();

      return () => bar.removeEventListener('resize', listener);
    }
  }, []);

  const colorMapping: { [key in (typeof products)[number]['color']]: string } = {
    red: 'bg-red',
    orange: 'bg-orange',
    yellow: 'bg-yellow',
    green: 'bg-green',
    pink: 'bg-pink',
    indigo: 'bg-indigo',
    primary: 'bg-primary',
    gray: 'bg-gray-40',
  };

  const planUsage = useAppSelector((state: RootState) => state.plan.planUsage);
  const maxBytesLimit = Math.max(planUsage, planLimitInBytes);
  const percentageUsed = Math.round((planUsage / planLimitInBytes) * 100);

  products.sort((a, b) => b.usageInBytes - a.usageInBytes);

  const usedProducts = products.filter((product) => product.usageInBytes > 0);

  return (
    <div className={`${className} w-full space-y-6 `}>
      <div className="flex flex-row">
        <div className="flex w-full grow flex-col">
          <p className="text-3xl font-medium leading-9 text-gray-100">{bytesToString(planUsage)}</p>
          <h1 className="text-base font-normal leading-5 ">
            {translate('views.preferences.workspace.overview.spaceUsed', { percentageUsed })}
          </h1>
        </div>
        <div className="mx-8 border border-gray-10" />
        <div className="flex w-full grow flex-col justify-start">
          <p className="text-3xl font-medium leading-9 text-gray-100">{bytesToString(planLimitInBytes)}</p>
          <h1 className="text-base font-normal leading-5 ">
            {translate('views.preferences.workspace.overview.totalSpace')}
          </h1>
        </div>
      </div>
      <div>
        <div className="mt-2 flex h-8 rounded bg-gray-5" ref={barRef}>
          {usedProducts.map((product, i) => (
            <Tooltip
              key={product.name}
              title={product.name}
              subtitle={bytesToString(product.usageInBytes)}
              popsFrom="top"
            >
              <div
                style={{ width: `${Math.max((product.usageInBytes / maxBytesLimit) * barWidth, 12)}px` }}
                className={`${colorMapping[product.color]} h-full border-r-2 border-surface dark:border-gray-1 ${
                  i === 0 ? 'rounded-l' : ''
                }`}
              />
            </Tooltip>
          ))}
        </div>
        <div className="mt-2 flex space-x-4">
          {products.map((product) => (
            <div key={product.name} className="flex items-center">
              <div className={`${colorMapping[product.color]} h-2.5 w-2.5 rounded-full`} />
              <p className="ml-1 text-sm text-gray-80">{product.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
