import { useEffect } from 'react';

function useEffectAsync(effect: () => void, inputs: Parameters<typeof useEffect>[1]): void {
  useEffect(() => {
    effect();
  }, inputs);
}

export default useEffectAsync;
