import { FC } from 'react';
import { Tooltip } from 'react-tooltip';

interface TooltipProps {
  id: string;
  delayShow?: number;
  className?: string;
}

export const DELAY_SHOW_MS = 400;

const TooltipElement: FC<TooltipProps> = ({ id, delayShow = 0, className = '' }) => (
  <Tooltip
    id={id}
    className={`absolute top-1 w-auto whitespace-nowrap rounded-md bg-black/75 px-2.5 py-1.5 text-center text-xs text-white ${className}`}
    delayShow={delayShow}
    noArrow
  />
);

export default TooltipElement;
