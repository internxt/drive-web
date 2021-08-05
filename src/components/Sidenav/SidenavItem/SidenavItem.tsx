import { Fragment } from 'react';
import { NavLink } from 'react-router-dom';

import './SidenavItem.scss';

interface SidenavItemProps {
  label: string,
  tooltipLabel?: string,
  to?: string,
  icon: JSX.Element,
  isOpen: boolean,
  onClick?: () => void
}

const SidenavItem = ({ label, tooltipLabel, to, icon, isOpen, onClick }: SidenavItemProps): JSX.Element => {
  const content: JSX.Element = (
    <Fragment>
      {icon}

      {isOpen
        ? <span className='ml-2.5 text-base text-neutral-10' data-for="mainTooltip" data-tip={tooltipLabel} data-iscapture="true">{label}</span>
        : null
      }
    </Fragment>
  );

  onClick = onClick || (() => { });

  return (
    <div className={`transform duration-200 ${isOpen ? '' : 'collapsed'} side-navigator-item`}
      onClick={onClick}
    >
      {
        to ?
          <NavLink exact className={`${isOpen ? '' : 'justify-center'} nav-link flex items-center`} to={to}>{content}</NavLink> :
          <div className={`${isOpen ? '' : 'justify-center'} flex items-center`}>{content}</div>
      }
    </div>
  );
};

export default SidenavItem;
