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
    className="absolute top-2 w-auto rounded bg-black-75 p-1 text-center text-xs text-white"
    delayShow={delayShow}
  />
);

export default TooltipElement;
