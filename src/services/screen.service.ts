import tailwindDefaultTheme from 'tailwindcss/defaultTheme';

function getInnerWidth(): number {
  return window.innerWidth;
}
function getInnerHeight(): number {
  return window.innerHeight;
}
function isLg(): boolean {
  const lgPixelsWidth = tailwindDefaultTheme.screens.lg;
  const lgWidth = parseInt(lgPixelsWidth.substring(0, lgPixelsWidth.length - 2));

  return getInnerWidth() > lgWidth;
}

const screenService = {
  getInnerWidth,
  getInnerHeight,
  isLg,
};

export default screenService;
