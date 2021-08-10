import { Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

import './SidenavItem.scss';

interface SidenavItemProps {
  label: string,
  to?: string,
  icon: JSX.Element,
  isOpen: boolean,
  onClick?: () => void
}

const SidenavItem = ({ label, to, icon, isOpen, onClick }: SidenavItemProps): JSX.Element => {
  const content: JSX.Element = (
    <Fragment>
      {icon}

      {isOpen
        ? <span className='ml-2.5 text-base text-neutral-10'>{label}</span>
        : null
      }
    </Fragment>
  );
  const overlay = (
    <Tooltip id="sidenav-tooltip" className="shadow-b bg-white py-2.5 px-4 text-xs rounded-r-4px">
      {label}
    </Tooltip>);

  onClick = onClick || (() => { });

  return (
    <OverlayTrigger
      placement="right"
      overlay={overlay}
      show={isOpen ? false : undefined}
    >
      <div
        className={`transform duration-200 ${isOpen ? '' : 'collapsed'} side-navigator-item`}
        onClick={onClick}
      >
        {
          to ?
            <NavLink exact className={`${isOpen ? '' : 'justify-center'} nav-link flex items-center py-1.5`} to={to}>{content}</NavLink> :
            <div className={`${isOpen ? '' : 'justify-center'} flex items-center py-1.5`}>{content}</div>
        }
      </div>
    </OverlayTrigger>

  );
};

export default SidenavItem;
