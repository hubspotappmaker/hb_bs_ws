import {ConflictException, Injectable, NotFoundException} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {HttpService} from "@nestjs/axios";
import { google } from 'googleapis';
import {App, Field, Platform, User} from "@app/common";
import {SoftDeleteModel} from "soft-delete-plugin-mongoose";
import {Connect} from "@app/common/schemas/connect.schema";
import {GoogleDriveCredentialDto} from "@app/common/interface/dto/application/application.filter.sto";
import {ConfigService} from "@nestjs/config";

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

        const existConnected = await this.appModel.findOne({
            user: userId,
            'credentials.hub_id': dto.hub_id,
            isDeleted: false
        });

        if (existConnected) {
            throw new ConflictException("user has already connected!")
        }

        const platform = await this.platformModel.findOne({name: 'GoogleDrive'});

        if (!platform) {
            throw new NotFoundException('GoogleDrive platform not found');
        }


            const createdApp = new this.appModel({
                platform: platform._id,
                user: userId,
                name: 'GoogleDrive',
                credentials: {
                    hub_id: dto.hub_id,
                    email: dto.email,
                    installed_date: dto.installed_date,
                    token: {
                        access_token: dto.token?.access_token,
                        refresh_token: dto.token?.refresh_token,
                        expires_in: dto.token?.expires_in,
                        token_type: dto.token?.token_type,
                        timestamp: dto.token?.timestamp,
                    },
                }
            });


        await createdApp.save();

        return {
            message: 'Google Drive connected successfully',
            appId: createdApp._id,
        };
    }

    async getUserTokenWithInfo(query: { userId?: string, hubId?: string, email?: string }) {
        const searchCriteria: any = {};

        if (query.userId) {
            searchCriteria.user = query.userId;
        }

        if (query.hubId) {
            searchCriteria['credentials.hub_id'] = query.hubId;
        }

        if (query.email) {
            searchCriteria['credentials.email'] = query.email;
        }

        const app =
            await this.appModel.findOne(searchCriteria)
                .populate('user')
                .exec();

        if (!app) {
            throw new NotFoundException('Google Drive credentials not found');
        }

        const user = app.user;

        return {
            user_id: user._id,
            token: app.credentials.token,
        };
    }


    async selectFolder(userId: string, hub_id: string, folderId: string) {
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