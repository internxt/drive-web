import React, { ReactNode } from 'react';
import './Circle.scss';

interface CircleProps {
    color: string
    image: string
}

const Circle = (props: CircleProps): ReactNode => {
  const style = {
    backgroundColor: props.color ? props.color : 'transparent',
    backgroundImage: props.image ? props.image : 'none'
  };

  return (<div className="circle" style={style}>&nbsp;</div>);
};

export default Circle;