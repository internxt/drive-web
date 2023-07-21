import { FC } from 'react';
import { Tooltip } from 'react-tooltip';

interface TooltipProps {
  id: string;
  delayShow?: number;
}

export const DELAY_SHOW_MS = 2000;

const TooltipElement: FC<TooltipProps> = ({ id, delayShow = 0 }) => (
  <Tooltip
    id={id}
    className="absolute top-1 w-auto whitespace-nowrap rounded-md bg-black-75 py-1.5 px-2.5 text-center text-xs text-white"
    delayShow={delayShow}
  />
);

export default TooltipElement;
