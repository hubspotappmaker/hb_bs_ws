import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from '@app/common';
import { SignInDto, SignUpDto } from '@app/common/interface/dto/common/auth.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService
  ) { }

  async signUp(signUpDto: SignUpDto) {
    const { name, email, password } = signUpDto;

    const exists = await this.userModel.findOne({ email }).exec();
    if (exists)
    {
      throw new ConflictException(`Email "${email}" is already in use`);
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const created = new this.userModel({
      name,
      email,
      password: hashedPassword,
    });
    const user = await created.save();

    const result = user.toObject();
    return result;
  }

  async getUserById(id: string) {
    if (!Types.ObjectId.isValid(id))
    {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const user = await this.userModel
      .findById(id)
      .select('-password')
      .exec();

    if (!user)
    {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async validateUser(email: string, plainPassword: string) {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(plainPassword, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const result = user;
    return result;
  }

  async signIn(signInDto: SignInDto) {
    const isValidUser = await this.validateUser(signInDto.email, signInDto.password);

    if (isValidUser)
    {
      console.log("chek id: ", isValidUser.id);
      const payload = {
        sub: isValidUser.id,
        email: isValidUser.email,
        role: isValidUser.role,
        name: isValidUser.name
      };

      const access_token = await this.jwtService.signAsync(payload);

      return {
        ...payload,
        access_token
      }
    }

  }
}
