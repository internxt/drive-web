export function getItemFullName(itemName: string, itemType?: string): string {
  return `${itemName}${itemType ? '.' + itemType : ''}`;
}

const nameService = {
  getItemFullName,
};

export default nameService;
