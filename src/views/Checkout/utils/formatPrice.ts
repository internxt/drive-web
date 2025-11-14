export const formatPrice = (price: number) => {
  const formattedAmount = Number(price.toFixed(2));
  return Number.isInteger(formattedAmount) ? formattedAmount.toString() : price.toFixed(2);
};
