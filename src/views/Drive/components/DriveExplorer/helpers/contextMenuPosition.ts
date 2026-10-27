export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export const getContextMenuPosition = (clickPoint: Point, menuSize: Size, viewport: Size): Point => {
  const overflowsRight = clickPoint.x + menuSize.width > viewport.width;
  const overflowsBottom = clickPoint.y + menuSize.height > viewport.height;

  return {
    x: overflowsRight ? clickPoint.x - menuSize.width : clickPoint.x,
    y: overflowsBottom ? clickPoint.y - menuSize.height : clickPoint.y,
  };
};
