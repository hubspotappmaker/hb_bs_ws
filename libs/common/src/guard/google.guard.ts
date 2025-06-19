import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
    NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { App } from '../schemas/app.schema';
import { firstValueFrom } from 'rxjs';
import {ConfigService} from "@nestjs/config";

@Injectable()
export class GoogleAccessTokenGuard implements CanActivate {
    constructor(
        private readonly httpService: HttpService,
        @InjectModel(App.name) private readonly appModel: Model<App>,
        private configService: ConfigService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];
        if (!token) throw new UnauthorizedException('Missing token');

        // Verify with Google
        const userInfo = await this.verifyGoogleToken(token);

        let app: App | null = null;

        if (!userInfo) {
            app = await this.appModel.findOne({ 'credentials.access_token': token });
            if (!app) throw new UnauthorizedException('Invalid token');

            const newToken = await this.refreshAccessToken(app);
            req.googleAccessToken = newToken;

            // Lấy lại userInfo
            const updatedUserInfo = await this.verifyGoogleToken(newToken);
            if (!updatedUserInfo) throw new UnauthorizedException('Unable to verify refreshed token');

            req.googleUserInfo = updatedUserInfo;
            req.app = app;
            req.user = app.user;
            return true;
        }

        app = await this.appModel.findOne({ 'credentials.email': userInfo.email }).populate('user');
        if (!app) throw new NotFoundException('App not found for email: ' + userInfo.email);

        req.googleAccessToken = token;
        req.googleUserInfo = userInfo;
        req.app = app;
        req.user = app.user;
        return true;
    }

    private async verifyGoogleToken(token: string): Promise<any> {
        try {
            const { data } = await firstValueFrom(
                this.httpService.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            );
            return data;
        } catch (error) {
            return null;
        }
    }

    private async refreshAccessToken(app: App): Promise<string> {
        const refreshToken = app.credentials.refresh_token;

        const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

        if (!clientId || !clientSecret) {
            throw new Error('Missing Google OAuth credentials in config');
        }

        const params = new URLSearchParams();
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        params.append('refresh_token', refreshToken);
        params.append('grant_type', 'refresh_token');

        try {
            const { data } = await firstValueFrom(
                this.httpService.post('https://oauth2.googleapis.com/token', params.toString(), {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                }),
            );

            await this.appModel.updateOne(
                { _id: app._id },
                {
                    $set: {
                        'credentials.access_token': data.access_token,
                        'credentials.expires_in': data.expires_in,
                        'credentials.token_type': data.token_type,
                        'credentials.timestamp': Date.now(),
                    },
                },
            );

            return data.access_token;
        } catch (error) {
            throw new UnauthorizedException('Failed to refresh token');
        }
    }
}
