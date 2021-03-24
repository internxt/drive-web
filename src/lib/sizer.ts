import PrettySize from 'prettysize';

export default function customPrettySize(size: number, removeSpace: boolean = true, useSingleChar: boolean = false, decimals: number = 1, hideSizeString: boolean = false) {
  if (size > 0) {
    return PrettySize(size, removeSpace, useSingleChar, decimals, hideSizeString);
  } else {
    return '0GB';
  }
}