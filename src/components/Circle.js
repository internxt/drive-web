import React from 'react';
import './Circle.css';

const Circle = props => {
    var style = {
        backgroundColor: props.color ? props.color : 'transparent',
        backgroundImage: props.image ? props.image : 'none'
    }
    return (<div className="circle" style={style}>&nbsp;</div>);
};

export default Circle;