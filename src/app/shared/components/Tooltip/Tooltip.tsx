import { FC } from 'react';
import { Tooltip } from 'react-tooltip';

interface TooltipProps {
  id: string;
  delayShow?: number;
}

const TooltipElement: FC<TooltipProps> = ({ id, delayShow = 0 }) => (
  <Tooltip
    id={id}
    className="absolute top-2 flex w-auto rounded bg-black-75 p-1 text-xs text-white"
    delayShow={delayShow}
  />
);

export default TooltipElement;
