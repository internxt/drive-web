let resolver: (() => void) | null = null;

// Needed to prevent race conditions and to wait for the name collision dialog to close so we can open another one if needed
export const nameCollisionPromise = {
  wait(): Promise<void> {
    return new Promise((resolve) => {
      resolver = resolve;
    });
  },
  resolve(): void {
    resolver?.();
    resolver = null;
  },
};
