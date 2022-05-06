import { ReactNode, useRef } from 'react';

export default function Tooltip({
  children,
  title,
  subtitle,
  popsFrom,
  style = 'light',
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  popsFrom: 'right' | 'left' | 'top' | 'bottom';
  style?: 'dark' | 'light';
}): JSX.Element {
  const tipRef = useRef<HTMLDivElement>(null);
  function handleMouseEnter() {
    if (tipRef.current) {
      tipRef.current.style.opacity = '1';
    }
  }
  function handleMouseLeave() {
    if (tipRef.current) {
      tipRef.current.style.opacity = '0';
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
      tooltipPosition = 'bottom-full left-1/2 -translate-x-1/2 mb-1.5';
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
    <div className="relative w-max" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div
        className={`absolute transform ${tooltipPosition} flex items-center ${trianglePosition} opacity-0 transition-all duration-150 ${
          style === 'light' ? 'drop-shadow-tooltip filter' : ''
        }`}
        ref={tipRef}
      >
        <div className={`w-max rounded-md px-3 py-1.5 text-center ${style === 'dark' ? 'bg-gray-90' : 'bg-white'}`}>
          <h1 className={`text-sm ${style === 'dark' ? 'text-white' : 'text-gray-80'}`}>{title}</h1>
          {subtitle && (
            <h2 className={`text-xs ${style === 'dark' ? 'text-white opacity-50' : 'text-gray-50'}`}>{subtitle}</h2>
          )}
        </div>
        <div
          className={`${popsFrom === 'bottom' || popsFrom === 'top' ? 'h-1.5 w-4' : 'h-4 w-1.5'} ${
            style === 'dark' ? 'bg-gray-90' : 'bg-white'
          }`}
          style={{ clipPath: triangle, marginTop: popsFrom === 'top' ? '-1px' : undefined }}
        ></div>
      </div>
      {children}
    </div>
  );
}
