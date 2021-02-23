import React from 'react';

const SVG = ({
  defaultColors = {},
  color = '#929294',
  width = 25,
  height = 7
}) => {
  // Use default colors if none hex color is set
  color = color.startsWith('#') ? color : defaultColors[color];
  return (
    <svg xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 25 7">
      <g fill={color}>
        <circle cx="12.5" cy="3.5" r="3.5"/>
        <circle cx="3.5" cy="3.5" r="3.5"/>
        <circle cx="21.5" cy="3.5" r="3.5"/>
      </g>
    </svg>
  );
};

export default SVG;