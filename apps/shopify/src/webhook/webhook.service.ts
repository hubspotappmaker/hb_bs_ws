import { CommonCustomer } from '@app/common/interface/data/customer.type';
import { CommonOrder, TaxUnit } from '@app/common/interface/data/order.type';
import { CommonProduct } from '@app/common/interface/data/product.type';
import { Injectable } from '@nestjs/common';
import { HubspotSyncService } from 'apps/hubspot/src/shopify/hubspot.sync.service';

@Injectable()
export class WebhookService {

    constructor(
        private readonly hubspotSyncService: HubspotSyncService
    ) { }

    async syncDataProduct(data: any, shopifyId: string, hubspotId: string, connectId: string) {

        const commonProduct: CommonProduct = {
            id: data.id ? data.id.toString() : 'N/A',
            platform: 'Shopify',
            name: data.title || 'Unknown Product',
            description: data.body_html || 'No description available',
            type: data.product_type || 'N/A',
            vendor: data.vendor || 'Unknown Vendor',
            status: data.status === 'active',
            tags: data.tags ? data.tags.split(',') : [],
            created_at: data.created_at || new Date().toISOString(),
            price: data.variants?.[0]?.price || '0',
            sku: data.variants?.[0]?.sku || 'N/A',
            quantity: data.variants?.[0]?.inventory_quantity || 0,
            inventory: data.variants?.[0]?.inventory_quantity || 0,
            taxable: data.variants?.[0]?.taxable ?? true,
            tax: data.variants?.[0]?.tax || 0,
            tax_unit: data.variants?.[0]?.tax_unit || TaxUnit.AMOUNT,
            images: data.images?.map(img => img.src) || [],
            width: data.variants?.[0]?.width || 0,
            height: data.variants?.[0]?.height || 0,
            weight: data.total_weight || data.variants?.[0]?.weight || 0,
        };

        await this.hubspotSyncService.syncProduct(commonProduct, hubspotId, connectId)

    }

    async syncDataCustomer(data: any, shopifyId: string, hubspotId: string, connectId: string) {
        // console.log("check body contact: ", data)
        const commonCustomer: CommonCustomer = {
            id: data.id ? data.id.toString() : 'N/A',
            platform: 'Shopify',
            email: data.email || '',
            created_at: data.created_at || new Date().toISOString(),
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            full_name: data.first_name || data.last_name ? `${data.first_name || ''} ${data.last_name || ''}`.trim() : '',
            note: data.note || '',
            verified_email: data.verified_email ?? false,
            currency: data.currency || 'N/A',
            phone:
                data.phone ||
                data.addresses?.find((addr: any) => addr.phone && addr.phone.trim() !== '')?.phone ||
                '',
            addresses: data.addresses?.map((addr: any) => ({
                first_name: addr.first_name || '',
                last_name: addr.last_name || '',
                company: addr.company || '',
                address1: addr.address1 || '',
                address2: addr.address2 || '',
                city: addr.city || '',
                province: addr.province || '',
                country: addr.country || '',
                zip: addr.zip || '',
                phone: addr.phone || '',
                full_name: addr.name || '',
                province_code: addr.province_code || '',
                country_code: addr.country_code || '',
                country_name: addr.country_name || '',
                default: addr.default || false,
            })) || [],
        };

        await this.hubspotSyncService.syncCustomer(commonCustomer, hubspotId, connectId)

    }

    async syncDataOrder(data: any, shopifyId: string, hubspotId: string, connectId: string): Promise<CommonOrder> {
        const commonOrder: CommonOrder = {
            id: data.id ? data.id.toString() : 'N/A',
            title: data.name,
            platform: 'Shopify',
            customer: data.customer ? {
                id: data.customer.id ? data.customer.id.toString() : 'N/A',
                email: data.customer.email || '',
                first_name: data.customer.first_name || '',
                last_name: data.customer.last_name || '',
                full_name: `${data.customer.first_name || ''} ${data.customer.last_name || ''}`.trim() || '',
            } : undefined,
            products: data.line_items?.map((item: any) => ({
                id: item.product_id ? item.product_id.toString() : 'N/A',
                name: item.title || 'Unknown Product',
                price: parseFloat(item.price) || 0,
                quantity: item.quantity || 0,
                sku: item.sku || 'N/A',
            })) || [],
            total_price: parseFloat(data.total_price) || 0,
            taxable: data.taxes_included ?? false,
            tax: parseFloat(data.total_tax) || 0,
            tax_unit: TaxUnit.AMOUNT,
            shipping_cost: parseFloat(data.total_shipping_price_set?.shop_money?.amount) || 0,
            shipping_address: data.shipping_address ? {
                address1: data.shipping_address.address1 || '',
                address2: data.shipping_address.address2 || '',
                city: data.shipping_address.city || '',
                province: data.shipping_address.province || '',
                country: data.shipping_address.country || '',
                zip: data.shipping_address.zip || '',
                phone: data.shipping_address.phone || '',
            } : undefined,
            transaction_id: data.id ? data.id.toString() : 'N/A',
            is_paid: data.financial_status === 'paid',
            payment_method: data.payment_gateway_names?.join(', ') || 'N/A',
            total_discount: parseFloat(data.total_discounts) || 0,
            shipping_method: data.shipping_lines?.[0]?.title || 'N/A',
            currency: data.currency || 'N/A',
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString(),
            notes: data.note || '',
        };

        await this.hubspotSyncService.syncOrder(commonOrder, hubspotId, connectId);

        return commonOrder;
    }
}
