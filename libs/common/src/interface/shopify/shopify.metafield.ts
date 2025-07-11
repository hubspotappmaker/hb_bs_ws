import { CommonModuleName } from "../enum/module.enum";

export interface ShopifyTranferTohubspot {
    connect_id: string,
    from: string,
    to: string
    module: CommonModuleName,
}