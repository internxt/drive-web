import { useReducer } from 'react';

const useForceUpdate = (): (() => void) => {
  return useReducer(() => ({}), {})[1] as () => void;
};

export default useForceUpdate;
