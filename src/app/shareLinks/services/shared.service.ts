import { SdkFactory } from 'app/core/factory/sdk';
import { ShareLink } from '../types';

// export interface getAllSharedLinksResponse {
//   pagination: {
//     page: number;
//     perPage: number;
//     totalItems: number;
//   };
//   sharedLinks: Array<ShareLink> | [];
// }

// const sharedService = {
//   async getAllSharedLinks(page: number, perPage: number): Promise<getAllSharedLinksResponse> {
//     const shareClient = SdkFactory.getInstance().createShareV2Client();
//     const { pagination, items } = await shareClient.getShareList(page, perPage);
//     return {
//       pagination: {
//         page: pagination.page,
//         perPage: pagination.perPage,
//         totalItems: pagination.countAll,
//       },
//       sharedLinks: items,
//     };
//   },
// };

// export default sharedService;
