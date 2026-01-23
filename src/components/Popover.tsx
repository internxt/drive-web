import { Popover as HPopover, Transition } from '@headlessui/react';
import { ReactNode } from 'react';

export interface PopoverRenderProps {
  open: boolean;
  close: () => void;
  Button: typeof HPopover.Button;
  Panel: typeof HPopover.Panel;
}

interface PopoverProps {
  childrenButton?: ReactNode;
  panel?: ReactNode | ((close: () => void) => ReactNode);
  className?: string;
  classButton?: string;
  classPanel?: string;
  panelStyle?: React.CSSProperties;
  buttonAs?: React.ElementType;
  useTransition?: boolean;
  alwaysShow?: boolean;
  children?: (props: PopoverRenderProps) => ReactNode;
}

const DEFAULT_PANEL_CLASS =
  'absolute right-0 z-50 mt-1 rounded-md border border-gray-10 bg-surface py-1.5 shadow-subtle dark:bg-gray-5';

export default function Popover({
  childrenButton,
  panel,
  className = '',
  classButton = '',
  classPanel,
  panelStyle,
  buttonAs,
  useTransition = true,
  alwaysShow = false,
  children,
}: Readonly<PopoverProps>): JSX.Element {
  if (children) {
    return (
      <HPopover className={className}>
        {({ open, close }) => <>{children({ open, close, Button: HPopover.Button, Panel: HPopover.Panel })}</>}
      </HPopover>
    );
  }

  const PanelContent = ({ close }: { close: () => void }) => <>{typeof panel === 'function' ? panel(close) : panel}</>;

  const Panel = (
    <HPopover.Panel className={classPanel || DEFAULT_PANEL_CLASS} style={panelStyle} static={alwaysShow}>
      {({ close }) => <PanelContent close={close} />}
    </HPopover.Panel>
  );

  return (
    <HPopover style={{ lineHeight: 0 }} className={`relative ${className}`}>
      <HPopover.Button as={buttonAs} className={`cursor-pointer outline-none ${classButton}`}>
        {childrenButton}
      </HPopover.Button>

      {useTransition ? (
        <Transition
          enter="transition duration-100 ease-out"
          enterFrom="scale-95 opacity-0"
          enterTo="scale-100 opacity-100"
          leave="transition duration-75 ease-out"
          leaveFrom="scale-100 opacity-100"
          leaveTo="scale-95 opacity-0"
          className="z-50"
        >
          {Panel}
        </Transition>
      ) : (
        Panel
      )}
    </HPopover>
  );
}
