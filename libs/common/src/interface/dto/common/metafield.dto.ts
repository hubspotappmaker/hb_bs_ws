import { IsMongoId, IsNotEmpty } from 'class-validator';

export class AssociateFieldDto {
    @IsMongoId({ message: 'from must be a valid ObjectId.' })
    @IsNotEmpty({ message: 'connect is required.' })
    connect: string;

    @IsMongoId({ message: 'from must be a valid ObjectId.' })
    @IsNotEmpty({ message: 'from is required.' })
    from: string;

    @IsMongoId({ message: 'to must be a valid ObjectId.' })
    @IsNotEmpty({ message: 'to is required.' })
    to: string;
}