export interface Iterator<T> {
  next(): Promise<{ value: T[], done: boolean }>
}
