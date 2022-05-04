import { IconProps } from 'phosphor-react';
import { ReactNode } from 'react';
import { matchPath, NavLink } from 'react-router-dom';

interface SidenavItemProps {
  label: string;
  showNew?: boolean;
  to?: string;
  Icon: React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;
  onClick?: () => void;
}

const SidenavItem = ({ label, to, Icon, onClick, showNew }: SidenavItemProps): JSX.Element => {
  const isActive = !!matchPath(window.location.pathname, { path: to, exact: true });

  const content: ReactNode = (
    <div className="flex w-full h-10 items-center justify-between">
      <div className="flex items-center">
        <Icon weight={isActive ? 'fill' : undefined} size={24} />
        <span className="ml-2">{label}</span>
      </div>
      {showNew && (
        <div className="uppercase bg-primary text-white text-xs font-medium rounded-full px-2.5 h-5">
          <p className="leading-5">new</p>
        </div>
      )}
    </div>
  );

  onClick = onClick || (() => undefined);

  return (
    <div
      onClick={onClick}
      className={`text-gray-60 font-medium pl-6 pr-3 cursor-pointer rounded-lg ${
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
