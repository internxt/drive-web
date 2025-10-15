export interface OwnerUserAuthenticationData {
  token: string;
  bridgeUser: string;
  bridgePass: string;
  encryptionKey: string;
  bucketId: string;
  // to manage B2B workspaces
  workspaceId?: string;
  workspacesToken?: string;
  resourcesToken: string;
}
