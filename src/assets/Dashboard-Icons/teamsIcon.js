import React from 'react';

const SVG = ({
    defaultColors = {},
    color = "#4385F4",
    width = 27,
    height = 20,
}) => {
    // Use default colors if none hex color is set
    color = color.startsWith('#') ? color : defaultColors[color];
    return (    
        <svg xmlns="http://www.w3.org/2000/svg" 
            width={width} 
            height={height} 
            viewBox="-175 -150 850 850">
        <path 
            fill={color} 
            d="m134.19 256.021c-21.65-17.738-41.257-15.39-66.29-15.39-37.44 0-67.9 30.28-67.9 67.49v109.21c0 16.16 13.19 29.3 29.41 29.3 70.026 0 61.59 1.267 61.59-3.02 0-77.386-9.166-134.137 43.19-187.59z" transform="translate(.078 .59)"/>
        </svg>      
    )
};

export default SVG;