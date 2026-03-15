const loadedScripts = new Map<string, Promise<void>>();

export const loadExternalScript = (src: string): Promise<void> => {
  const existing = loadedScripts.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadedScripts.delete(src);
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });

  loadedScripts.set(src, promise);
  return promise;
};
