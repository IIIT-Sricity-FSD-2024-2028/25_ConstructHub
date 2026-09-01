import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { LoginDto } from './login.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly companiesService: CompaniesService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Account status check
    if (user.status === 'inactive') {
      throw new ForbiddenException('Account is locked or inactive. Please contact admin.');
    }

    // Password verification with backward compatibility for plaintext seed data
    let isValidPassword = false;
    if (user.password) {
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        isValidPassword = bcrypt.compareSync(pass, user.password);
      } else if (user.password === pass) {
        isValidPassword = true;
        try {
          const hashedPassword = bcrypt.hashSync(pass, 10);
          user.password = hashedPassword;
          this.usersService.update(user.id, { password: hashedPassword });
        } catch (e) {
          // ignore memory update error
        }
      }
    }

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Company active status check (unless superuser)
    if (user.companyId && user.role !== 'superuser') {
      try {
        const company = this.companiesService.findOne(user.companyId);
        if (company && company.status === 'inactive') {
          throw new ForbiddenException('Company workspace is inactive. Access denied.');
        }
      } catch (e) {
        if (e instanceof ForbiddenException) throw e;
        // Ignore if company record not found for superuser or legacy data
      }
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload = {
      sub: user.id,
      role: user.role,
      companyId: user.companyId || '',
    };

    const token = this.jwtService.sign(payload);

    // Sanitize user object to never return password
    const { password, ...safeUser } = user;

    return {
      accessToken: token,
      user: safeUser,
    };
  }
}
