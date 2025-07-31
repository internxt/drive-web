export interface LegacyShardMeta {
  hash: string;
  size: number;
  index: number;
  parity: boolean;
  challenges?: Buffer[];
  challenges_as_str: string[];
  tree: string[];
}

export type ShardMeta = Omit<LegacyShardMeta, 'challenges' | 'challenges_as_str' | 'tree'>;
