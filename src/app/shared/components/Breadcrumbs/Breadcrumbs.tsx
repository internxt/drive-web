import { CaretRight } from 'phosphor-react';
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
    if(this.props.items.length > 3){
      this.props.items.splice(1, this.props.items.length - 3, 
        {
          id: this.props.items[this.props.items.length - 3].id,
          label: '···',
          icon: null,
          active: true,
          onClick: this.props.items[this.props.items.length - 3].onClick,
        });
    }
    return this.props.items.map((item) => <>{!(item.id === this.props.items[0].id) && <CaretRight className='mt-2.5 text-gray-50 font-medium'/>}<BreadcrumbsItem key={item.id} item={item} /></>);
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
