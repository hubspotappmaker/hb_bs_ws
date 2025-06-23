import {BadRequestException, ConflictException, Injectable, NotFoundException} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {HttpService} from "@nestjs/axios";
import { google } from 'googleapis';
import {App, Field, Platform, User} from "@app/common";
import {SoftDeleteModel} from "soft-delete-plugin-mongoose";
import {Connect} from "@app/common/schemas/connect.schema";
import {GoogleDriveCredentialDto} from "@app/common/interface/dto/application/application.filter.sto";
import {ConfigService} from "@nestjs/config";
import * as bcrypt from "bcrypt";

@Injectable()
export  class GoogleDriverApplicationService {
    private oauth2Client;

    constructor(
        @InjectModel(App.name) private readonly appModel: SoftDeleteModel<App>,
        @InjectModel(Platform.name) private readonly platformModel: SoftDeleteModel<Platform>,
        @InjectModel(User.name) private readonly userModel: SoftDeleteModel<User>,
        @InjectModel(Connect.name) private readonly connectModel: SoftDeleteModel<Connect>,
        @InjectModel(Field.name) private readonly fieldModel: SoftDeleteModel<Field>,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.oauth2Client = new google.auth.OAuth2(
            this.configService.get<string>('GOOGLE_CLIENT_ID'),
            this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
            this.configService.get<string>('GOOGLE_REDIRECT_URI'),
        );
    }

    async saveTokens(
        hub_id: string, tokenData: {
            access_token: string;
            refresh_token: string;
            expiry_date: number;
        }) {
        const {access_token, refresh_token, expiry_date} = tokenData;

        return this.appModel.findOneAndUpdate(
            {hub_id},
            {access_token, refresh_token, expiry_date},
            {upsert: true, new: true},
        );
    }

    async getAuthorizedClient(hub_id: string) {

        const creds = await this.appModel.findOne({hub_id});
        if (!creds) throw new Error('Google credentials not found');

        const { access_token, refresh_token, expiry_date } = creds.credentials;

        this.oauth2Client.setCredentials({access_token, refresh_token, expiry_date});

        const now = Date.now();
        if (!expiry_date || expiry_date < now + 60000) {
            const {credentials} = await this.oauth2Client.refreshAccessToken();
            await this.appModel.findOneAndUpdate(
                {hub_id},
                {
                    access_token: credentials.access_token,
                    expiry_date: credentials.expiry_date,
                },
                {new: true},
            );
            this.oauth2Client.setCredentials(credentials);
        }

        return this.oauth2Client;
    }

    async saveFolderId(hub_id: string, folder_id: string) {
        return this.appModel.findOneAndUpdate(
            {hub_id},
            {drive_root_folder_id: folder_id},
            {new: true},
        );
    }


    async connectGoogleDrive(dto: GoogleDriveCredentialDto, userId: string) {

        let { email, hub_id, installed_date, token, folder_id, app_id } = dto;

        if (typeof token === 'string') {
            try {
                token = JSON.parse(token);
            } catch (e) {
                throw new BadRequestException('Invalid token format');
            }
        }

        let user = await this.userModel.findOne({ email });
        if (!user) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash('1', saltRounds);

            user = await this.userModel.create({
                email,
                name: email.split('@')[0],
                role: 'user',
                password : hashedPassword
            });
        }

        const platform = await this.platformModel.findOne({ name: 'google_drive' });
        if (!platform) throw new NotFoundException('Platform google_drive not found');

        let app = await this.appModel.findOne({ user: user._id, platform: platform._id });

        const credentials = {
            hub_id,
            email,
            token: {...token, token_type: 'google_access_token',installed_date,folder_id},
        };

        if (!app) {
            app = await this.appModel.create({
                user: user._id,
                platform: platform._id,
                name: 'Google_Drive',
                credentials,
            });
        } else {
            app.credentials = credentials;
            await app.save();
        }

        return {
            message: 'Google Drive connected successfully',
            hub_id,
            email: user.email,
        };
    }

    async getUserTokenWithInfo(query: {
        userId?: string;
        hubId?: string;
        email?: string;
    }) {
        const search: any = {};

        if (query.userId) {
            search.user = query.userId;
        }

        if (query.hubId) {
            search['credentials.hub_id'] = query.hubId;
        }

        if (query.email) {
            search['credentials.email'] = query.email;
        }

        const app = await this.appModel.findOne(search).
        populate<{ user: User }>('user').exec();
        if (!app) {
            throw new NotFoundException('App not found with provided criteria');
        }

        const data = app.toObject()
        return {
            email:(data?.user as User)?.email,
            hub_id: app.credentials?.hub_id,
            app_id:app._id,
            installed_date:  app.credentials?.token?.installed_date || null,
            token: app.credentials?.token || {},
            folder_id: app.credentials?.token?.folder_id || null,
            user_status:(data?.user as User)?.isActive
        };
    }


    async saveGoogleDriveFolderId(userId: string, hub_id: string, folderId: string) {
        const app = await this.appModel.findOne({
            user: userId,
            'credentials.hub_id': hub_id,
            isDeleted: false,
        });

        if (!app) {
            throw new NotFoundException('Connected app not found');
        }

        const credentials = app.credentials;

        // Update the app with the folderId
        credentials.drive_root_folder_id = folderId;
        await app.save();

        return {
            message: 'Folder successfully selected and saved.',
            folderId: app.credentials.drive_root_folder_id,
        };
    }
}