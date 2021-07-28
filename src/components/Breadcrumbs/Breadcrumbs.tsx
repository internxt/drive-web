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
      <li className={`flex items-center ${item.active ? 'active' : ''}`} key={item.id} onClick={() => this.onItemClicked(item)}>
        { item.icon ? <img alt="" className="icon h-3" src={item.icon} /> : null}
        { item.label ? <span className="label">{item.label}</span> : null}
      </li>
    ));
  }

  onItemClicked = (item: BreadcrumbItemData): void => {
    if (item.active) {
      item.onClick && item.onClick();
    }
  }

  render(): ReactNode {
    return (
      <nav>
        {this.itemsList.length > 0 ?
          <ol className="breadcrumb">
            {this.itemsList}
          </ol> :
          ''}
      </nav>
    );
  }
}

export interface BreadcrumbItemData {
  id: string | number;
  label: string;
  icon: string | null | undefined;
  active: boolean;
  onClick?: () => void;
}

export default Breadcrumbs;