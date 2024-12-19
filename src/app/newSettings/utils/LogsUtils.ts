const getEnumKey = <T extends Record<string, string>>(enumObj: T, value: string): keyof T | null => {
  const entries = Object.entries(enumObj) as [keyof T, string][];

  for (const [key, val] of entries) {
    if (val === value) {
      return key;
    }
  }

  return null;
};

export { getEnumKey };
