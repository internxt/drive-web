function insertAt(array: unknown[], index: number, elementsToInsert: unknown[]): void {
  array.splice(index, 0, ...elementsToInsert);
}

const arrayService = {
  insertAt,
};

export default arrayService;
