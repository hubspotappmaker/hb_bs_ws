export interface ShopifyCustomerResponse {
    data: {
        customer: {
            id: string;
            email: string;
            tags: string[];
            emailMarketingConsent: { marketingState: string };
            smsMarketingConsent: { marketingState: string };
            note: string;
        };
    };
}

export interface HubspotUpdatePayload {
    properties: {
        shopify_email_subscription_fconnector: string;
        shopify_sms_subscription_fconnector: string;
        shopify_tag_fconnector: string;
    };
}