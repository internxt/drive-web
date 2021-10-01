import { useEffect } from 'react';

function useEffectAsync(effect, inputs) {
  useEffect(() => {
    effect();
  }, inputs);
}

export default useEffectAsync;
