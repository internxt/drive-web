import PrettySize from 'prettysize';

export function bytesToString(size: number, removeSpace: boolean = true, useSingleChar: boolean = false, decimals: number = 1, hideSizeString: boolean = false): string {
  if (size > 0) {
    return PrettySize(size, removeSpace, useSingleChar, decimals, hideSizeString);
  } else {
    return '...';
  }
}

const sizeService = {
  bytesToString
};

export default sizeService;