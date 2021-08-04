import PrettySize from 'prettysize';

export function bytesToString(size: number, removeSpace: boolean = true, useSingleChar: boolean = false, decimals: number = 1, hideSizeString: boolean = false): string {
  let result = '0';

  if (size > 0) {
    result = PrettySize(size, removeSpace, useSingleChar, decimals, hideSizeString);
  }

  return result;
}

const sizeService = {
  bytesToString
};

export default sizeService;