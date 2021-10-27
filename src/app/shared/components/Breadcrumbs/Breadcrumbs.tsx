import React, { ReactNode } from 'react';

import './Breadcrumbs.scss';
import BreadcrumbsItem from './BreadcrumbsItem/BreadcrumbsItem';

interface BreadcrumbsProps {
  items: BreadcrumbItemData[];
}

class Breadcrumbs extends React.Component<BreadcrumbsProps> {
  constructor(props: BreadcrumbsProps) {
    super(props);
  }

  get itemsList(): JSX.Element[] {
    return this.props.items.map((item) => <BreadcrumbsItem key={item.id} item={item} />);
  }

  render(): ReactNode {
    return <nav>{this.itemsList.length > 0 ? <ol className="breadcrumb">{this.itemsList}</ol> : ''}</nav>;
  }
}

export interface BreadcrumbItemData {
  id: number;
  label: string;
  icon: JSX.Element | null;
  active: boolean;
  onClick?: () => void;
}

export default Breadcrumbs;
