import { App } from '@app/common';
import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { HubspotCredentialService } from '../hubspot.credential.service';
import { FormatCustomField } from '@app/common/interface/type/field.type';
import { firstValueFrom } from 'rxjs';
import { HubspotModuleName } from '@app/common/interface/enum/hubspot/hubspot.enum';

@Injectable()
export class HubspotMetafieldService {
    constructor(
        @InjectModel(App.name) private appModel: SoftDeleteModel<App>,
        private readonly httpService: HttpService,
        private readonly hubspotCredentialService: HubspotCredentialService,
    ) { }

    async getAllCustomField(hubspot_id: string, hubspotModuleName: HubspotModuleName, prefix: string): Promise<FormatCustomField[]> {
        const token = await this.hubspotCredentialService.getToken(hubspot_id);

        try
        {
            const response = await firstValueFrom(
                this.httpService.get(`https://api.hubapi.com/crm/v3/properties/${hubspotModuleName}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            );

            const data = response.data;
            if (!Array.isArray(data.results))
            {
                throw new InternalServerErrorException('Unexpected response from HubSpot API');
            }

            console.log("check data: ", data)

            const customFields: FormatCustomField[] = data.results
                .filter(item => !item.hubspotDefined && item.name.endsWith(`_${prefix}custom`))
                .map(item => ({
                    name: item.name,
                    label: item.label,
                    description: item.description || '',
                }));

            return customFields;
        } catch (error)
        {
            throw new InternalServerErrorException(
                `Failed to retrieve custom fields: ${error.message}`,
            );
        }
    }
}
