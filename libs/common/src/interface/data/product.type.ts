import { TaxUnit } from "./order.type";

export interface CommonProduct {
    id?: string;
    platform?: string;
    name?: string;
    description?: string;
    type?: string;
    vendor?: string;
    status?: boolean;
    tags?: string[];
    created_at?: string;
    price?: string;
    sku?: string;
    quantity?: number;
    inventory?: number;
    taxable?: boolean,
    tax?: number,
    tax_unit?: TaxUnit;
    images?: string[];
    width?: number;
    height?: number;
    weight?: string;
}
