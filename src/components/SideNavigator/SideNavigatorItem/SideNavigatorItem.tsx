import { Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import './SideNavigatorItem.scss';

interface SideNavigatorItemProps {
  label: string,
  tooltipLabel?: string,
  to?: string,
  icon: string,
  isOpen: boolean,
  onClick?: () => void
}

const SideNavigatorItem = ({ label, tooltipLabel, to, icon, isOpen, onClick }: SideNavigatorItemProps): JSX.Element => {
  const content: JSX.Element = (
    <Fragment>
      <img src={icon} alt="" className='h-4' />

      {isOpen
        ? <span className='ml-2.5 text-base text-neutral-10' data-for="mainTooltip" data-tip={tooltipLabel} data-iscapture="true">{label}</span>
        : null
      }
    </Fragment>
  );

  onClick = onClick || (() => { });

  return (
    <div className={`${isOpen ? '' : 'collapsed'} side-navigator-item`}
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

export default SideNavigatorItem;
