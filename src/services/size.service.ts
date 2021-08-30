import PrettySize from 'prettysize';

export function bytesToString(
  size: number,
  removeSpace = true,
  useSingleChar = false,
  decimals = 1,
  hideSizeString = false,
): string {
  if (size > 0) {
    return PrettySize(size, removeSpace, useSingleChar, decimals, hideSizeString);
  } else {
    return '';
  }
}

const sizeService = {
  bytesToString,
};

export default sizeService;
