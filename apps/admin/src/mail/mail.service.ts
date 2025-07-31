import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    constructor(private readonly mailerService: MailerService) { }

    async sendEmail(params: {
        subject: string;
        text: string;
        html?: string;
        to?: string[];
    }) {
        try {
            const recipients = params.to ?? ['dungth@onextdigital.com'];

            const sendMailParams = {
                to: recipients,
                subject: params.subject,
                text: params.text,
                html: params.html,
            };
            const response = await this.mailerService.sendMail(sendMailParams);
            this.logger.log(`Email sent: ${JSON.stringify(sendMailParams)}`, response);
        } catch (error) {
            this.logger.error(`Error sending mail: ${JSON.stringify(params)}`, error);
        }
    }
}
