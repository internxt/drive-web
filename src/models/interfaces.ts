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
