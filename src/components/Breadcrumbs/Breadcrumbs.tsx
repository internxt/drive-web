import React, { ReactNode } from 'react';

import './Breadcrumbs.scss';

interface BreadcrumbsProps {
  items: BreadcrumbItemData[];
}

class Breadcrumbs extends React.Component<BreadcrumbsProps> {
  constructor(props: BreadcrumbsProps) {
    super(props);
  }

  get itemsList(): JSX.Element[] {
    return this.props.items.map((item) => (
      <li
        className={`flex items-center ${item.active ? 'active' : ''}`}
        key={item.id}
        onClick={() => this.onItemClicked(item)}
      >
        {item.icon ? item.icon : null}
        {item.label ? <span className="label">{item.label}</span> : null}
      </li>
    ));
  }

  onItemClicked = (item: BreadcrumbItemData): void => {
    if (item.active) {
      item.onClick && item.onClick();
    }
  };

  render(): ReactNode {
    return <nav>{this.itemsList.length > 0 ? <ol className="breadcrumb">{this.itemsList}</ol> : ''}</nav>;
  }
}

export interface BreadcrumbItemData {
  id: string | number;
  label: string;
  icon: JSX.Element | null;
  active: boolean;
  onClick?: () => void;
}

export default Breadcrumbs;
