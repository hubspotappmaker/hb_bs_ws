import { IsMongoId, IsNotEmpty, IsString } from "class-validator";
import { CommonModuleName } from "../../enum/module.enum";

export class CreateCustomFieldDto {
    @IsMongoId({ message: 'to must be a valid ObjectId.' })
    @IsNotEmpty({ message: 'to is required.' })
    connect_id: string

    @IsString()
    @IsNotEmpty({ message: 'to is required.' })
    name: string;

    @IsNotEmpty({ message: 'to is required.' })
    module: CommonModuleName
}