import React, { ReactNode } from 'react';

import './Breadcrumbs.scss';

interface BreadcrumbsProps {
  items: BreadcrumbItemData[];
}

interface BreadcrumbsState { }

class Breadcrumbs extends React.Component<BreadcrumbsProps, BreadcrumbsState> {
  constructor(props: BreadcrumbsProps) {
    super(props);

    this.state = {};
  }

  get itemsList(): JSX.Element[] {
    return this.props.items.map(item => (
      <li className={`cursor-pointer flex items-center ${item.active ? 'active' : ''}`} key={item.name} onClick={item.onClick}>
        <img alt="" className="breadcrumb-item-icon" src={item.icon} />
        { item.label ? <span className="label">{item.label}</span> : null}
      </li>
    ));
  }

  render(): ReactNode {
    return (
      <nav>
        {this.itemsList.length > 0 ?
          <ol className="breadcrumb">
            {this.itemsList}
          </ol> :
          'empty breadcrumbs'}
      </nav>
    );
  }
}

export interface BreadcrumbItemData {
  name: string;
  label: string;
  icon: string;
  active: boolean;
  onClick?: () => void;
}

export default Breadcrumbs;