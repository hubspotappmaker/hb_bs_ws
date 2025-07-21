import { IsMongoId, IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateConnectDto {
    @IsString({ message: 'connectName must be a string.' })
    @IsNotEmpty({ message: 'connectName is required.' })
    @Length(5, 80, { message: 'connectName must be between 5 and 80 characters.' })
    connectName: string;

    @IsMongoId({ message: 'from must be a valid ObjectId.' })
    @IsNotEmpty({ message: 'from is required.' })
    from: string;

    @IsMongoId({ message: 'to must be a valid ObjectId.' })
    @IsNotEmpty({ message: 'to is required.' })
    to: string;
}


export class UpdateConnectDto {
    @IsMongoId({ message: 'from must be a valid ObjectId.' })
    @IsNotEmpty({ message: 'from is required.' })
    id: string;

    @IsString()
    @IsNotEmpty()
    @Length(5, 30)
    name: string;
}

export class ChangeSourceConnectDto {
    @IsMongoId()
    @IsNotEmpty()
    id: string;

    @IsMongoId()
    @IsNotEmpty()
    from: string;

    @IsMongoId()
    @IsNotEmpty()
    to: string;
}
