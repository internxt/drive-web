import { Upload } from 'phosphor-react';
import { ReactNode } from 'react';

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
}

export default function Empty({ icon, title, subtitle, action }: EmptyProps): JSX.Element {
  let button: ReactNode = null;

  if (action) {
    button = (
      <button
        onClick={action.onClick}
        className={`mx-auto flex items-center rounded-lg ${
          action.style === 'elevated' ? 'mt-5 bg-primary' : 'mt-2.5 bg-transparent'
        } h-10 bg-opacity-10 px-5 font-medium text-primary hover:bg-opacity-15 active:bg-opacity-20`}
      >
        {action.text}
        <action.icon className="ml-2" size={20} weight="bold" />
      </button>
    );
  }

  return (
    <div className="h-full w-full  p-8">
      <div className="flex h-full items-center justify-center">
        <div className="mb-28">
          <div className="mx-auto mb-10 w-max">{icon}</div>
          <div className="pointer-events-none text-center">
            <p className="mb-1 block text-3xl font-semibold text-gray-100">{title}</p>
            <p className="block text-lg text-gray-60">{subtitle}</p>
          </div>
          {button}
        </div>
      </div>
    </div>
  );
}
