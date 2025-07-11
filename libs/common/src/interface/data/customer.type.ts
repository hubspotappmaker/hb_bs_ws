export interface CommonCustomer {
    id?: string;
    platform?: string;
    email?: string;
    created_at?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    note?: string;
    verified_email?: boolean;
    currency?: string;
    phone?: string;
    addresses?: CommonAddress[];
    tag?: string
}

export interface CommonAddress {
    first_name?: string;
    last_name?: string;
    company?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
    phone?: string;
    full_name?: string;
    province_code?: string;
    country_code?: string;
    country_name?: string;
    default?: boolean;
}
