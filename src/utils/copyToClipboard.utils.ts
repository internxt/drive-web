import copy from 'copy-to-clipboard';

export const copyTextToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    copy(text);
  }
};
