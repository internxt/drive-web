import { Mock, vi } from 'vitest';
import { SdkFactory } from 'app/core/factory/sdk';

type ClientFactoryName = {
  [K in keyof SdkFactory]: K extends `create${string}Client${string}` ? K : never;
}[keyof SdkFactory];

type SdkClients = {
  [K in ClientFactoryName]?: Partial<Awaited<ReturnType<SdkFactory[K]>>>;
};

export const mockSdkFactory = <T extends SdkClients>(clients: T): { [K in keyof T]: Mock } => {
  const clientFactories = Object.fromEntries(
    Object.entries(clients).map(([name, client]) => [name, vi.fn().mockReturnValue(client)]),
  );
  vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue(clientFactories as unknown as SdkFactory);
  return clientFactories as { [K in keyof T]: Mock };
};
