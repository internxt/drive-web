interface NetworkInformation {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  downlinkMax?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

export type NetworkInfo = {
  type: string | undefined;
  effectiveType: string | undefined;
  downlink: number | undefined;
  downlinkMax: number | undefined;
  rtt: number | undefined;
  saveData: boolean | undefined;
};

export const getNetworkInformation = (): NetworkInfo | null => {
  const nav = navigator as NavigatorWithConnection;
  const connection = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;

  if (!connection) return null;

  return {
    type: connection.type,
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    downlinkMax: connection.downlinkMax,
    rtt: connection.rtt,
    saveData: connection.saveData,
  };
};

export const logNetworkInfoForUpload = (context: Record<string, unknown>): void => {
  const networkInfo = getNetworkInformation();

  if (!networkInfo) return;

  console.log('[Upload] Network information:', { ...context, ...networkInfo });
};
