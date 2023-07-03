import { IconProps } from '@phosphor-icons/react';

const Icon = ({
  state,
  Icon,
}: {
  state: 'pending' | 'completed' | 'current';
  Icon: React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;
}): JSX.Element => {
  const background = {
    pending: 'bg-gray-5',
    completed: 'bg-white border-2 border-opacity-15 border-primary',
    current: 'bg-primary',
  };
  const iconColor = {
    pending: 'text-gray-80',
    completed: 'text-primary',
    current: 'text-white',
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`${background[state]} flex rounded-full p-3`}>
        <Icon size={24} weight="light" className={iconColor[state]} />
      </div>
    </div>
  );
};

export default Icon;
