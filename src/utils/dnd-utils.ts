import { createDragDropManager } from 'dnd-core';
import { HTML5Backend } from 'react-dnd-html5-backend';

export const manager = createDragDropManager(HTML5Backend);
