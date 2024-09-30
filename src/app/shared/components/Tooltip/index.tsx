import { ReactNode, useRef, useState } from 'react';

export default function Tooltip({
  children,
  title,
  subtitle,
  popsFrom,
  className,
  delayInMs,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  popsFrom: 'right' | 'left' | 'top' | 'bottom';
  className?: string;
  delayInMs?: number;
}): JSX.Element {
  const [visible, setVisible] = useState(false);

  const timeoutRef = useRef<null | number>(null);

  function show() {
    setVisible(true);
  }

  function hide() {
    setVisible(false);
  }

  function handleMouseEnter() {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    show();
  }
  function handleMouseLeave() {
    if (delayInMs) {
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        hide();
      }, delayInMs) as unknown as number;
    } else {
      hide();
    }
  }

  let tooltipPosition = '';
  let trianglePosition = '';
  let triangle = '';

  switch (popsFrom) {
    case 'right':
      tooltipPosition = 'left-full top-1/2 -translate-y-1/2 ml-1.5';
      trianglePosition = 'flex-row-reverse';
      triangle = 'polygon(100% 0%, 100% 100%, 0% 50%)';
      break;
    case 'left':
      tooltipPosition = 'right-full top-1/2 -translate-y-1/2 mr-1.5';
      trianglePosition = 'flex-row';
      triangle = 'polygon(0% 0%, 0% 100%, 100% 50%)';
      break;
    case 'top':
      tooltipPosition = 'bottom-full left-1/2 -translate-x-1/2 mb-1.5 origin-bottom';
      trianglePosition = 'flex-col';
      triangle = 'polygon(0% 0%, 100% 0%, 50% 100%)';
      break;
    case 'bottom':
      tooltipPosition = 'top-full left-1/2 -translate-x-1/2 mt-1.5';
      trianglePosition = 'flex-col-reverse';
      triangle = 'polygon(50% 0%, 0% 100%, 100% 100%)';
      break;
  }

  return (
    <div
      className={`relative w-max ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ lineHeight: 0 }}
    >
      <div
        className={`pointer-events-none absolute ${tooltipPosition} flex items-center ${trianglePosition} drop-shadow-tooltip transition-all duration-150 ${
          visible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      >
        <div className="w-max rounded-lg bg-gray-90 px-4 py-1.5 text-center dark:bg-gray-5">
          <p className="text-base text-white">{title}</p>
          {subtitle && <p className="-mt-1 text-sm text-gray-40">{subtitle}</p>}
        </div>
        <div
          className={`bg-gray-90 dark:bg-gray-5 ${
            popsFrom === 'bottom' || popsFrom === 'top' ? 'h-1.5 w-4' : 'h-4 w-1.5'
          }`}
          style={{ clipPath: triangle, marginTop: popsFrom === 'top' ? '-1px' : undefined }}
        ></div>
      </div>
      {children}
    </div>
  );
}
