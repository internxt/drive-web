import { IconProps } from 'phosphor-react';
import { ReactNode } from 'react';
import { matchPath, NavLink } from 'react-router-dom';

interface SidenavItemProps {
  label: string;
  to?: string;
  Icon: React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;
  onClick?: () => void;
}

const SidenavItem = ({ label, to, Icon, onClick }: SidenavItemProps): JSX.Element => {
  const isActive = !!matchPath(window.location.pathname, { path: to, exact: true });

  const content: ReactNode = (
    <div className="flex w-full h-10 items-center">
      <Icon weight={isActive ? 'fill' : undefined} size={24} />
      <span className="ml-2">{label}</span>
    </div>
  );

  onClick = onClick || (() => undefined);

  return (
    <div
      onClick={onClick}
      className={`text-gray-60 pl-6 cursor-pointer rounded-lg ${
        isActive ? 'bg-primary bg-opacity-10' : 'hover:bg-gray-5'
      }`}
    >
      {to ? (
        <NavLink
          className={`no-underline text-current hover:text-current ${
            isActive ? 'text-primary hover:text-primary' : ''
          }`}
          exact
          to={to}
        >
          {content}
        </NavLink>
      ) : (
        content
      )}
    </div>
  );
};

export default SidenavItem;
