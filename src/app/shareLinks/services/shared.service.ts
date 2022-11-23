
import { SdkFactory } from 'app/core/factory/sdk';
import { ListShareLinksItem } from '@internxt/sdk/dist/drive/share/types';//import { ShareLink } from '../types';

export interface getAllSharedLinksResponse {
    pagination: {
        page: number;
        perPage: number;
    };
    sharedLinks: ListShareLinksItem[] | [];//Array<ShareLink> | [];
}

const sharedService = {
    async getAllSharedLinks(page: number, perPage: number): Promise<getAllSharedLinksResponse> {
        const shareClient = SdkFactory.getInstance().createShareClient();
        const { pagination, items } = await shareClient.getShareLinks(page, perPage);

        return {
            pagination: {
                page: pagination.page,
                perPage: pagination.perPage,
            },
            sharedLinks: items,
        };
    },
};

export default sharedService;
