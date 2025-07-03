import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { HttpService } from "@nestjs/axios";
import { google } from 'googleapis';
import { App, Field, Platform, User } from "@app/common";
import { SoftDeleteModel } from "soft-delete-plugin-mongoose";
import { Connect } from "@app/common/schemas/connect.schema";
import { GoogleDriveCredentialDto } from "@app/common/interface/dto/application/application.filter.sto";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { PlatformName, PlatformType } from "@app/common/interface/enum/platform.enum";
import { CommonApplicationService } from "./common-application.service";
import { Types } from "mongoose";
import axios from "axios";

@Injectable()
export class GoogleDriverApplicationService {
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
        const { access_token, refresh_token, expiry_date } = tokenData;

        return this.appModel.findOneAndUpdate(
            { hub_id },
            { access_token, refresh_token, expiry_date },
            { upsert: true, new: true },
        );
    }

    async getAuthorizedClient(hub_id: string) {

        const creds = await this.appModel.findOne({ hub_id });
        if (!creds) throw new Error('Google credentials not found');

        const { access_token, refresh_token, expiry_date } = creds.credentials;

        this.oauth2Client.setCredentials({ access_token, refresh_token, expiry_date });

        const now = Date.now();
        if (!expiry_date || expiry_date < now + 60000)
        {
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            await this.appModel.findOneAndUpdate(
                { hub_id },
                {
                    access_token: credentials.access_token,
                    expiry_date: credentials.expiry_date,
                },
                { new: true },
            );
            this.oauth2Client.setCredentials(credentials);
        }

        return this.oauth2Client;
    }

    async saveFolderId(hub_id: string, folder_id: string) {
        return this.appModel.findOneAndUpdate(
            { hub_id },
            { drive_root_folder_id: folder_id },
            { new: true },
        );
    }



    async connectGoogleDrive(dto: GoogleDriveCredentialDto, userId: string) {
        let { email, hub_id, installed_date, token, folder_id, app_id, platform_name } = dto;

        if (typeof token === 'string')
        {
            try
            {
                token = JSON.parse(token);
            } catch (e)
            {
                throw new BadRequestException('Invalid token format');
            }
        }

        let user = await this.userModel.findOne({ _id: new Types.ObjectId(userId) });
        if (!user)
        {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash('1', saltRounds);

            user = await this.userModel.create({
                email,
                name: email.split('@')[0],
                role: 'user',
                password: hashedPassword
            });
        }

        let platform;
        if (platform_name)
        {
            platform = await this.platformModel.findOne({ name: platform_name });
            if (!platform)
            {
                platform = await this.platformModel.create({
                    name: platform_name,
                    baseUrl: 'url',
                    type: PlatformType.CRM
                });
            }
        } else
        {
            const platforms = [PlatformName.GOOGLE_DRIVE, PlatformName.HUBSPOT];
            const platformPromises = platforms.map(async (platformName) => {
                let existingPlatform = await this.platformModel.findOne({ name: platformName });
                if (!existingPlatform)
                {
                    existingPlatform = await this.platformModel.create({
                        name: platformName,
                        baseUrl: 'url',
                        type: platformName === PlatformName.GOOGLE_DRIVE ? PlatformType.ECOMMERCE : PlatformType.CRM
                    });
                }
                return existingPlatform;
            });

            const createdPlatforms = await Promise.all(platformPromises);
            platform = createdPlatforms[0];
        }


        const query: any = {
            user: user._id,
            platform: platform._id,
            isDeleted: false,
        };

        if (hub_id && platform_name === PlatformName.HUBSPOT)
        {
            query['credentials.hub_id'] = hub_id;
        }

        if (folder_id)
        {
            query['credentials.token.folder_id'] = folder_id;
        }

        let existingApp = await this.appModel.findOne(query);

        let credentials;
        let appName;

        switch (platform.name.toLowerCase())
        {
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
                const appChecker = await this.appModel.findOne({
                    'credentials.hub_id': hub_id,
                    isDeleted: false
                })

                console.log("check appChecker: ", appChecker);

                if (appChecker)
                {
                    if (appChecker?.user != user.id)
                    {
                        throw new ConflictException("This hubspot account is used!");
                    }
                }
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

        if (existingApp)
        {
            console.log(`Đã tìm thấy App tồn tại với user=${user._id} và hub_id=${hub_id} cho platform=${platform.name}, tiến hành UPDATE.`);

            const oldPrefix = existingApp.credentials?.prefix || '';
            const newPrefix = credentials.prefix || '';

            if (oldPrefix !== newPrefix)
            {
                const listConnect = await this.connectModel.find({
                    user: user._id,
                    to: existingApp._id
                }).exec();

                if (listConnect.length > 0)
                {
                    console.log("check listConnect: ", listConnect);

                    const updatePromises = listConnect.map(async conn => {
                        // Update connection
                        await this.connectModel.findByIdAndUpdate(
                            conn._id,
                            { syncMetafield: false }
                        ).exec();

                        console.log("conn.id: ", conn._id);

                        const deleteResult = await this.fieldModel.deleteMany({
                            connect: conn._id,
                            user: user._id
                        });

                        console.log("check deleteResult: ", deleteResult);
                    });

                    await Promise.all(updatePromises);
                }
            }

            existingApp.credentials = credentials;
            existingApp.name = appName;
            await existingApp.save();
            console.log("check existingApp: ", existingApp);
            return {
                message: `${platform.name} updated successfully`,
                app: existingApp,
                hub_id,
                email: user.email,
                platform: platform.name
            };

        } else
        {
            console.log(`Không tìm thấy App với user=${user._id} và hub_id=${hub_id} cho platform=${platform.name}, tiến hành CREATE mới.`);

            const createdApp = new this.appModel({
                platform: platform._id,
                name: appName,
                user: user._id,
                credentials: credentials,
            });

            console.log(" check app create new: ", createdApp);

            const savedApp = await createdApp.save();

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
        portalId?: string,
        platformName?: string
    }) {
        const search: any = {};

        if (query.hubId)
        {
            search['credentials.hub_id'] = query.hubId;
        }

        if (query.platformName)
        {
            const platform = await this.platformModel.findOne({ name: query.platformName })
            if (platform)
            {
                search['platform'] = platform._id;
            } else
            {
                throw new NotFoundException('Platform not found');
            }
        }

        const app = await this.appModel.findOne({
            ...search,
            isDeleted: false
        }).

            populate<{ user: User }>('user').exec();
        if (!app)
        {
            throw new NotFoundException('App not found with provided criteria');
        }

        // console.log("check appppp: ", app)

        const connection = await this.connectModel.findOne(
            {
                to: app.id,
            }
        )

        console.log("check connection: ", connection)

        const data = app.toObject()
        return {
            email: (data?.user as User)?.email,
            hub_id: app.credentials?.hub_id,
            app_id: app._id,
            installed_date: app.credentials?.token?.installed_date || null,
            token: app.credentials?.token || {},
            folder_id: app.credentials?.token?.folder_id || null,
            user_status: (data?.user as User)?.isActive
        };
    }


    async saveGoogleDriveFolderId(email) {

        const platform: Platform | any = await this.platformModel.findOne({ name: PlatformName.HUBSPOT });
        if (!platform)
        {
            throw new Error('Không tìm thấy platform Hubspot');
        }

        const user: User | any = await this.userModel.findOne({ email: email });
        if (!user)
        {
            throw new Error('Không tìm thấy user với email đã cung cấp');
        }

        let existingApp = await this.appModel.findOne({
            user: user?._id,
            platform: platform?._id,
            isDeleted: false
        });


        if (!existingApp)
        {
            return { hub_id: null }
        } else
        {
            console.log(existingApp)
            if (!existingApp.credentials?.hub_id)
            {
                throw new BadRequestException('Người dùng chưa kết nối hubspot!')
            } else
            {
                return {
                    hub_id: existingApp.credentials?.hub_id
                }
            }
        }
    }

    async updateCredential(dto) {

        let existingPlatform: any = await this.platformModel.findOne({ name: PlatformName.GOOGLE_DRIVE });

        const user: any = await this.userModel.findOne({ email: dto.email })
        const query: any = {
            user: user._id,
            platform: existingPlatform._id,
            isDeleted: false,
        };

        if (dto.hub_id && dto.platform_name === PlatformName.GOOGLE_DRIVE)
        {
            query['credentials.hub_id'] = dto.hub_id;
        }


        let existingApp: any = await this.appModel.findOne(query);

        const credentials = {
            hub_id: dto.hub_id,
            email: dto.email,
            token: {
                ...dto.token,
                token_type: 'google_access_token',
                installed_date: dto.installed_date,
                folder_id: dto.folder_id
            },
            prefix: ''
        };

        const oldPrefix = existingApp.credentials?.prefix || '';
        const newPrefix = credentials?.prefix || '';

        if (oldPrefix !== newPrefix)
        {
            const listConnect = await this.connectModel.find({
                user: user._id,
                to: existingApp._id
            }).exec();

            if (listConnect.length > 0)
            {
                console.log("check listConnect: ", listConnect);

                const updatePromises = listConnect.map(async conn => {
                    // Update connection
                    await this.connectModel.findByIdAndUpdate(
                        conn._id,
                        { syncMetafield: false }
                    ).exec();

                    console.log("conn.id: ", conn._id);

                    const deleteResult = await this.fieldModel.deleteMany({
                        connect: conn._id,
                        user: user._id
                    });

                    console.log("check deleteResult: ", deleteResult);
                });

                await Promise.all(updatePromises);
            }
        }


        existingApp.credentials = credentials;
        await existingApp.save();

        return {
            message: `updated successfully`,
            app: existingApp,
            hub_id: dto.hub_id,
            email: user.email,
            platform: PlatformName.GOOGLE_DRIVE
        };
    }

}