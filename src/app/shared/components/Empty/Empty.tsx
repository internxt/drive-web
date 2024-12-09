import { Upload } from '@phosphor-icons/react';
import { ReactNode } from 'react';
import { Button } from '@internxt/ui';

interface EmptyProps {
  icon: JSX.Element;
  title: string;
  subtitle: string;
  action?: {
    text: string;
    icon: typeof Upload;
    style: 'plain' | 'elevated';
    onClick: () => void;
  };
  contextMenuClick?: (event: any) => void;
}

export default function Empty({ icon, title, subtitle, action, contextMenuClick }: EmptyProps): JSX.Element {
  let button: ReactNode = null;

  if (action) {
    button = (
      <Button variant="secondary" onClick={action.onClick}>
        <span>{action.text}</span>
        <action.icon size={20} />
      </Button>
    );
  }

  return (
    <div className="h-full w-full p-8" onContextMenu={contextMenuClick}>
      <div className="flex h-full flex-col items-center justify-center space-y-6 pb-20">
        <div className="pointer-events-none mx-auto w-max">{icon}</div>
        <div className="pointer-events-none space-y-1 text-center">
          <p className="text-2xl font-medium text-gray-100">{title}</p>
          <p className="text-lg text-gray-60">{subtitle}</p>
        </div>
        {button}
      </div>
    </div>
  );
}
