import {BadRequestException, Injectable, NotFoundException} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {HttpService} from "@nestjs/axios";
import {google} from 'googleapis';
import {App, Field, Platform, User} from "@app/common";
import {SoftDeleteModel} from "soft-delete-plugin-mongoose";
import {Connect} from "@app/common/schemas/connect.schema";
import {GoogleDriveCredentialDto} from "@app/common/interface/dto/application/application.filter.sto";
import {ConfigService} from "@nestjs/config";
import * as bcrypt from "bcrypt";
import {PlatformName, PlatformType} from "@app/common/interface/enum/platform.enum";
import {CommonApplicationService} from "./common-application.service";

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
        private readonly commonApplicationService: CommonApplicationService,

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
        let { email, hub_id, installed_date, token, folder_id, app_id, platform_name } = dto;

        // Parse token if it's a string
        if (typeof token === 'string') {
            try {
                token = JSON.parse(token);
            } catch (e) {
                throw new BadRequestException('Invalid token format');
            }
        }

        // Find or create user
        let user = await this.userModel.findOne({ email });
        if (!user) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash('1', saltRounds);

            user = await this.userModel.create({
                email,
                name: email.split('@')[0],
                role: 'user',
                password: hashedPassword
            });
        }

        // Handle platform creation/retrieval
        let platform;
        if (platform_name) {
            // Find specific platform
            platform = await this.platformModel.findOne({ name: platform_name });
            if (!platform) {
                platform = await this.platformModel.create({
                    name: platform_name,
                    baseUrl: 'url',
                    type: PlatformType.CRM
                });
            }
        } else {
            // Create both platforms if none specified
            const platforms = [PlatformName.GOOGLE_DRIVE, PlatformName.HUBSPOT];
            const platformPromises = platforms.map(async (platformName) => {
                let existingPlatform = await this.platformModel.findOne({ name: platformName });
                if (!existingPlatform) {
                    existingPlatform = await this.platformModel.create({
                        name: platformName,
                        baseUrl: 'url',
                        type: platformName === PlatformName.GOOGLE_DRIVE ? PlatformType.ECOMMERCE : PlatformType.CRM
                    });
                }
                return existingPlatform;
            });

            const createdPlatforms = await Promise.all(platformPromises);
            platform = createdPlatforms[0]; // Use first platform as default
        }


        const query: any = {
            user: user._id,
            platform: platform._id,
            isDeleted: false,
        };

        if (hub_id && platform_name === PlatformName.HUBSPOT) {
            query['credentials.hub_id'] = hub_id;
        }

        if (folder_id) {
            query['credentials.token.folder_id'] = folder_id;
        }

        // Check for existing app
        let existingApp = await this.appModel.findOne(query);

        // Prepare credentials based on platform
        let credentials;
        let appName;

        switch (platform.name.toLowerCase()) {
            case 'google_drive':
                credentials = {
                    hub_id,
                    email,
                    token: {
                        ...token,
                        token_type: 'google_access_token',
                        installed_date,
                        folder_id
                    },
                    prefix: ''
                };
                appName = `GoogleDrive[${folder_id}]`;
                break;

            case 'hubspot':
                credentials = {
                    hub_id: hub_id,
                    refresh_token: token?.refresh_token,
                    access_token: token?.access_token,
                    email,
                    fullName: token?.full_name || email.split('@')[0],
                    prefix: token?.prefix || '',
                    token_type: 'hubspot_access_token',
                };
                appName = `hubSpot[${hub_id}]`;
                break;

            default:
                credentials = {
                    hub_id,
                    email,
                    token: {
                        ...token,
                        installed_date,
                        folder_id
                    },
                    prefix: ''
                };
                appName = `${platform.name}[${hub_id}]`;
                break;
        }

        if (existingApp) {
            console.log(`Đã tìm thấy App tồn tại với user=${user._id} và hub_id=${hub_id} cho platform=${platform.name}, tiến hành UPDATE.`);

            const oldPrefix = existingApp.credentials?.prefix || '';
            const newPrefix = credentials.prefix || '';

            if (oldPrefix !== newPrefix) {
                const listConnect = await this.connectModel.find({
                    user: user._id,
                    to: existingApp._id
                }).exec();

                if (listConnect.length > 0) {
                    console.log("check listConnect: ", listConnect);

                    const updatePromises = listConnect.map(async conn => {
                        // Update connection
                        await this.connectModel.findByIdAndUpdate(
                            conn._id,
                            { syncMetafield: false }
                        ).exec();

                        console.log("conn.id: ", conn._id);

                        // Delete related fields
                        const deleteResult = await this.fieldModel.deleteMany({
                            connect: conn._id,
                            user: user._id
                        });

                        console.log("check deleteResult: ", deleteResult);
                    });

                    await Promise.all(updatePromises);
                }
            }

            // Update existing app credentials
            existingApp.credentials = credentials;
            existingApp.name = appName; // Update name in case platform changed
            await existingApp.save();

            return {
                message: `${platform.name} updated successfully`,
                app: existingApp,
                hub_id,
                email: user.email,
                platform: platform.name
            };

        } else {
            console.log(`Không tìm thấy App với user=${user._id} và hub_id=${hub_id} cho platform=${platform.name}, tiến hành CREATE mới.`);

            const createdApp = new this.appModel({
                platform: platform._id,
                name: appName,
                user: user._id,
                credentials: credentials,
            });

            const savedApp = await createdApp.save();

            // Create modules for the app
            const listModule = await this.commonApplicationService.createModuleForApp(
                savedApp._id,
                platform._id
            );

            savedApp.ModuleApp = listModule;
            await savedApp.save();

            return {
                message: `${platform.name} connected successfully`,
                app: savedApp,
                hub_id,
                email: user.email,
                platform: platform.name
            };
        }
    }
    async getUserTokenWithInfo(query: {
        userId?: string;
        hubId?: string;
        email?: string;
        portalId? : string,
        platformName?:string
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
        if (query.portalId) {
            search['credentials.hub_id'] = query.portalId;
        }

        if(query.platformName){
            const platform = await this.platformModel.findOne({name: query.platformName})
            if(platform){
                search['platform'] = platform._id ;
            }else{
                throw new NotFoundException('Platform not found');
            }
        }

        console.log(search)

        const app = await this.appModel.findOne(search).
        populate<{ user: User }>('user').exec();
        if (!app) {
            throw new NotFoundException('App not found with provided criteria');
        }

        const connection = await this.connectModel.findOne()

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


    async saveGoogleDriveFolderId(email) {

        const platform: Platform | any = await this.platformModel.findOne({ name: PlatformName.HUBSPOT });
        if (!platform) {
            throw new Error('Không tìm thấy platform Hubspot');
        }

        const user: User | any = await this.userModel.findOne({ email: email });
        if (!user) {
            throw new Error('Không tìm thấy user với email đã cung cấp');
        }

        let existingApp = await this.appModel.findOne({
            user: user?._id,
            platform: platform?._id,
            isDeleted: false
        });


        if(!existingApp){
            throw new BadRequestException('Người dùng chưa kết nối hubspot')
        }else {
            console.log(existingApp)
            if (!existingApp.credentials?.hub_id) {
                throw new BadRequestException('Người dùng chưa kết nối hubspot!')
            } else {
                return {
                    hub_id: existingApp.credentials?.hub_id
                }
            }
        }
    }

}