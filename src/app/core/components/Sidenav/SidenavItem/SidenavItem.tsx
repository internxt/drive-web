import { IconProps } from 'phosphor-react';
import { ReactNode } from 'react';
import { matchPath, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface SidenavItemProps {
  label: string;
  showNew?: boolean;
  to?: string;
  Icon: React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;
  onClick?: () => void;
}

const SidenavItem = ({ label, to, Icon, onClick, showNew }: SidenavItemProps): JSX.Element => {
  const isActive = !!matchPath(window.location.pathname, { path: to, exact: true });

  const { translate } = useTranslationContext();

  const content: ReactNode = (
    <div className="flex h-10 w-full items-center justify-between">
      <div className="flex items-center">
        <Icon weight={isActive ? 'fill' : undefined} size={24} />
        <span className="ml-2">{label}</span>
      </div>
      {showNew && (
        <div className="h-5 rounded-full bg-primary px-2.5 text-xs font-medium uppercase text-white">
          <p className="leading-5">{translate('general.new')}</p>
        </div>
      )}
    </div>
  );

  onClick = onClick || (() => undefined);

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg pl-6 pr-3 font-medium text-gray-60 ${
        isActive ? 'bg-primary bg-opacity-10' : 'hover:bg-gray-1 active:bg-gray-5'
      }`}
    >
      {to ? (
        <NavLink
          className={`text-current no-underline hover:text-current ${
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
