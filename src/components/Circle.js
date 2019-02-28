import React from 'react';
import './Circle.css';

const Circle = props => {
    return (<div className="circle" style={{backgroundColor: props.color}}>&nbsp;</div>);
};

export default Circle;