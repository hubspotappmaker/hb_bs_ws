import { HubspotModuleName } from "../interface/enum/hubspot/hubspot.enum";
import { CommonModuleName } from "../interface/enum/module.enum";
import { ShopifyModuleName } from "../interface/enum/shopify/shopify.enum";

export function mapCommonToHubspotModule(
    moduleName: CommonModuleName,
): HubspotModuleName {
    switch (moduleName)
    {
        case CommonModuleName.CUSTOMER:
            return HubspotModuleName.CONTACT;
        case CommonModuleName.PRODUCT:
            return HubspotModuleName.PRODUCT;
        case CommonModuleName.ORDER:
            return HubspotModuleName.DEAL;
        default:
            throw new Error(
                `No corresponding HubspotModuleName for CommonModuleName '${moduleName}'`,
            );
    }
}

export function mapCommonToShopifyModule(
    moduleName: CommonModuleName,
): ShopifyModuleName {
    switch (moduleName)
    {
        case CommonModuleName.CUSTOMER:
            return ShopifyModuleName.CUSTOMER;
        case CommonModuleName.PRODUCT:
            return ShopifyModuleName.PRODUCT;
        case CommonModuleName.ORDER:
            return ShopifyModuleName.ORDER;
        default:
            throw new Error(
                `No corresponding ShopifyModuleName for CommonModuleName '${moduleName}'`,
            );
    }
}

export function mapHubspotToCommonModule(
    hubspotName: HubspotModuleName,
): CommonModuleName {
    switch (hubspotName)
    {
        case HubspotModuleName.CONTACT:
            return CommonModuleName.CUSTOMER;
        case HubspotModuleName.PRODUCT:
            return CommonModuleName.PRODUCT;
        case HubspotModuleName.DEAL:
            return CommonModuleName.ORDER;
        default:
            throw new Error(
                `No corresponding CommonModuleName for HubspotModuleName '${hubspotName}'`
            );
    }
}

export function mapShopifyToCommonModule(
    shopifyName: ShopifyModuleName,
): CommonModuleName {
    switch (shopifyName)
    {
        case ShopifyModuleName.CUSTOMER:
            return CommonModuleName.CUSTOMER;
        case ShopifyModuleName.PRODUCT:
            return CommonModuleName.PRODUCT;
        case ShopifyModuleName.ORDER:
            return CommonModuleName.ORDER;
        default:
            throw new Error(
                `No corresponding CommonModuleName for ShopifyModuleName '${shopifyName}'`
            );
    }
}
