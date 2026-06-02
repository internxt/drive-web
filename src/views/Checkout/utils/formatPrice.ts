export const formatPrice = (price: number) => {
  const truncated = Math.round(Number(price.toFixed(8)) * 100) / 100;
  const formatted = truncated.toFixed(2);
  return formatted.endsWith('.00') ? String(truncated) : formatted;
};
