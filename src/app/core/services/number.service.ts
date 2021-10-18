function hasDecimals(value: number): boolean {
  return value - Math.floor(value) !== 0;
}

const numberService = {
  hasDecimals,
};

export default numberService;
