import i18n from 'app/i18n/services/i18n.service';
import { useEffect, useRef, useState } from 'react';
import { bytesToString } from '../../../drive/services/size.service';
import Tooltip from '../Tooltip';

export default function UsageDetails({
  className = '',
  planLimitInBytes,
  products,
}: {
  className?: string;
  planLimitInBytes: number;
  products: {
    name: string;
    usageInBytes: number;
    color: 'red' | 'orange' | 'yellow' | 'green' | 'pink' | 'indigo' | 'teal' | 'mint' | 'primary' | 'gray';
  }[];
}): JSX.Element {
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

  const colorMapping: { [key in typeof products[number]['color']]: string } = {
    red: 'bg-red-std',
    orange: 'bg-orange',
    yellow: 'bg-yellow',
    green: 'bg-green',
    pink: 'bg-pink',
    indigo: 'bg-indigo',
    teal: 'bg-teal',
    mint: 'bg-mint',
    primary: 'bg-primary',
    gray: 'bg-gray-40',
  };

  const totalUsedInBytes = products.reduce((prev, current) => prev + current.usageInBytes, 0);
  const percentageUsed = Math.round((totalUsedInBytes / planLimitInBytes) * 100);

  products.sort((a, b) => b.usageInBytes - a.usageInBytes);

  const usedProducts = products.filter((product) => product.usageInBytes > 0);

  return (
    <div className={`${className}`}>
      <div className="flex justify-between">
        <p className="text-gray-80">
          {i18n.get('views.account.tabs.account.usage', {
            totalUsed: bytesToString(totalUsedInBytes),
            totalSpace: bytesToString(planLimitInBytes),
          })}
        </p>
        <p className="text-gray-50">{percentageUsed}%</p>
      </div>
      <div className="mt-2 flex h-2 rounded-sm bg-gray-5" ref={barRef}>
        {usedProducts.map((product, i) => (
          <Tooltip
            key={product.name}
            style="light"
            title={product.name}
            subtitle={bytesToString(product.usageInBytes)}
            popsFrom="top"
          >
            <div
              style={{ width: `${Math.max((product.usageInBytes / planLimitInBytes) * barWidth, 12)}px` }}
              className={`${colorMapping[product.color]} h-2 border-r-2 border-white ${i === 0 ? 'rounded-l-sm' : ''}`}
            />
          </Tooltip>
        ))}
      </div>
      <div className="mt-2 flex space-x-4 ">
        {products.map((product) => (
          <div key={product.name} className="flex items-center">
            <div className={`${colorMapping[product.color]} h-2.5 w-2.5 rounded-full`} />
            <p className="ml-1 text-sm text-gray-80">{product.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
