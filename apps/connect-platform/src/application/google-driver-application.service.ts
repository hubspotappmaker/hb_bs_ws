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
import { lastValueFrom } from "rxjs";
import * as crypto from 'crypto';

@Injectable()
export class GoogleDriverApplicationService {
    private oauth2Client;
    private readonly GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
    private readonly CLIENT_ID = process.env.GDRIVE_ID || "";
    private readonly CLIENT_SECRET = process.env.GDRIVE_SECRET || '';
    private readonly SECRET_KEY = '9f9b663e7993467c964af277fb4f8e61812fa8372927197bd99d6ac25e2d6858';


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

    encrypt(data: string): string {
        const iv = crypto.randomBytes(16);
        const key = Buffer.from(this.SECRET_KEY.padEnd(32, '0').slice(0, 32), 'utf-8');
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    decrypt(encryptedData: string): string {
        const parts = encryptedData.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const key = Buffer.from(this.SECRET_KEY.padEnd(32, '0').slice(0, 32), 'utf-8');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
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
        console.log("check func istall gdrive: ", token);
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
                }).populate('user');

                if (appChecker)
                {
                    if (appChecker?.user.id != user.id)
                    {
                        //@ts-ignore
                        throw new ConflictException("This hubspot account is used by: " + appChecker?.user?.email);
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
    async getUserTokenWithInfo(hubId: string) {

        try
        {
            if (!hubId) return;
            console.log("check hubId: ", hubId);
            const hubApp = await this.appModel.findOne({
                'credentials.hub_id': hubId,
                isDeleted: false,
                platform: new Types.ObjectId("686f6896c4132a30126636af"),
            });



            if (!hubApp)
            {
                return;
            }

            console.log("check hubApp: ", hubApp);

            const connectPoint = await this.connectModel.findOne({
                from: hubApp.id,
                isActive: true,
                isDeleted: false
            }).populate('to')
                .populate('user');


            if (!connectPoint)
            {
                return {}
            }

            //@ts-ignore
            console.log("check connectPoint user: ", connectPoint.user.isActive)

            //@ts-ignore
            if (!connectPoint.user.isActive)
            {
                return {}
            }



            const app: any = connectPoint.to;
            console.log("check install date: ", app.credentials.token?.installed_date);
            console.log("check date now: ", new Date().toISOString());
            const tokenInfo = app.credentials.token || {};
            const installedDateStr = tokenInfo.installed_date;
            const now = new Date();

            if (installedDateStr)
            {
                const installedDate = new Date(installedDateStr);
                const diffMs = now.getTime() - installedDate.getTime();
                const diffMinutes = diffMs / 1000 / 60;

                console.log("check install date: ", installedDateStr);
                console.log("check date now: ", now.toISOString());
                console.log(`Diff minutes: ${diffMinutes}`);

                if (diffMinutes > 50)
                {
                    // Chuẩn bị payload cho request refresh
                    const params = new URLSearchParams();
                    params.append('client_id', this.CLIENT_ID);
                    params.append('client_secret', this.CLIENT_SECRET);
                    params.append('refresh_token', tokenInfo.refresh_token);
                    params.append('grant_type', 'refresh_token');

                    // Gọi API
                    const response = await lastValueFrom(
                        this.httpService.post(this.GOOGLE_TOKEN_URL, params.toString(), {
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        })
                    );

                    const data = response.data;
                    console.log('Google refresh response:', data);

                    // Cập nhật token mới và thời điểm cấp
                    tokenInfo.access_token = data.access_token;
                    tokenInfo.expires_in = data.expires_in;
                    tokenInfo.installed_date = now.toISOString();

                    // Lưu lại vào DB
                    await app.save();
                }
            }


            return {
                email: app.credentials.email,
                hub_id: app.credentials.hub_id,
                app_id: app._id,
                installed_date: app.credentials.token?.installed_date || null,
                token: this.encrypt(JSON.stringify(app.credentials.token || {})),
                folder_id: app.credentials.token?.folder_id || null,
                user_status: true
            };
        } catch (error)
        {
            console.log("check loi: ", error);
            throw new NotFoundException("Not found token with this hubspot account!");
        }
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

    async updateCredential(dto: GoogleDriveCredentialDto) {
        const { hub_id } = dto
        if (!hub_id) return;
        console.log("check hubId: ", hub_id);
        const hubApp = await this.appModel.findOne({
            'credentials.hub_id': hub_id,
            isDeleted: false,
            platform: new Types.ObjectId("685e14ef65837eed8865d8ff"),
        });



        if (!hubApp)
        {
            return;
        }

        console.log("check hubApp: ", hubApp);

        const connectPoint = await this.connectModel.findOne({
            from: hubApp.id,
            isActive: true,
            isDeleted: false
        }).populate('to');
        console.log("check connectPoint: ", connectPoint)



        if (!connectPoint)
        {
            return {}
        }

        if (connectPoint.to)
        {
            console.log("check to app: ", connectPoint.to);
        }

        const updateApp = connectPoint.to as unknown as App;

        updateApp.credentials["token"] = dto.token

        const savedApp = await updateApp.save();

        console.log("check savedAppL: ", savedApp);


    }

}