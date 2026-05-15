export const formatPrice = (price: number) => {
  const truncated = Math.floor(Number(price.toFixed(8)) * 100) / 100;
  return truncated.toFixed(2);
};
