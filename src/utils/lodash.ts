export function uniqueId(prefix = ''): string {
  return `${prefix}${crypto.randomUUID()}`;
}

function concat<T>(...arrays: T[][]): T[] {
  return ([] as T[]).concat(...arrays);
}

function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function sample<T>(array: T[]): T | undefined {
  if (!array.length) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

const _ = { concat, chunk, sample, uniqueId };

export default _;
