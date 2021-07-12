import { FileStatusType } from './enums';

export interface UserSettings {
  bucket: string
  createdAt: Date
  credit: number
  email: string
  lastname: string
  mnemonic: string
  name: string
  privateKey: string
  publicKey: string
  registerCompleted: boolean
  revocationKey: string
  root_folder_id: number
  userId: string
  uuid: string
}

export interface TeamsSettings {
  bucket: string
  bridge_mnemonic: string
  isAdmin: boolean
  bridge_password: string
  bridge_user: string
}

export interface FileData {
  isFolder: boolean,
  isSelected:boolean,
  isLoading:boolean,
  isDowloading:boolean,
  id: number,
  parentId: number,
  name: string,
  bucket: string | null,
  user_id: number,
  icon_id: number | null,
  color: string | null,
  encrypt_version: string | null,
  createdAt: string,
  updatedAt: string,
  userId: number,
  iconId: number | null,
  parent_id: number | null,
  icon: string | null,
  fileStatus: FileStatusType,
  progress: string
}