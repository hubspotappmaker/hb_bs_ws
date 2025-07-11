import { CommonAddress, CommonCustomer } from "./customer.type";
import { CommonProduct } from "./product.type";



export enum TaxUnit {
    PERCENT = 'percent',
    AMOUNT = 'amount',
}

export interface CommonOrder {
    id?: string;
    title?: string;
    platform?: string;
    customer?: CommonCustomer;
    products?: CommonProduct[];
    total_price?: number;
    taxable?: boolean;
    tax?: number;
    tax_unit?: TaxUnit;
    shipping_cost?: number;
    shipping_address?: CommonAddress;
    transaction_id?: string;
    is_paid?: boolean;
    payment_method?: string;
    total_discount?: number;
    shipping_method?: string;
    currency?: string;
    created_at?: string;
    updated_at?: string;
    notes?: string;
}
