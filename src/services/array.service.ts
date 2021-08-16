function insertAt(array: any[], index: number, elementsToInsert: any[]): void {
  array.splice(index, 0, ...elementsToInsert);
}

const arrayService = {
  insertAt
};

export default arrayService;