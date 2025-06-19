import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ERROR_CODE, ERROR_MESSAGE } from "../../common/constants/error-message.constants";
import { UserEntity } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(UserEntity)
		private readonly userRepository: Repository<UserEntity>,
	) {}

	repository() {
		return this.userRepository;
	}

	async createUser(createUserDto: CreateUserDto): Promise<UserEntity> {
		const check = await this.userRepository.findOneBy({
			id: createUserDto.email,
		});

		if (check)
			throw new NotFoundException({
				message: ERROR_MESSAGE.USER_ALREADY_EXIST,
				errorCode: ERROR_CODE.USER_ALREADY_EXIST,
			});

		return await this.userRepository.save(createUserDto);
	}
}
