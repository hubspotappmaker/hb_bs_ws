import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Post } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserEntity } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";

@ApiTags("Users")
@Controller("users")
@ApiBearerAuth()
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Post()
	async createUser(@Body() userCreateDto: CreateUserDto): Promise<UserEntity> {
		return await this.userService.createUser(userCreateDto);
	}

	@Get("me")
	get_me() {
		return;
	}
}
