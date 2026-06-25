export type FileKey = {
  mnemonic?: string;
  bucketKey?: Buffer;
  encryptionKey?: Buffer;
};

export interface NetworkCredentials {
  user: string;
  pass: string;
}
