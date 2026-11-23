import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { LoginDto } from './login.dto';
import { RegisterClientDto } from './register-client.dto';
import * as bcrypt from 'bcryptjs';
import { companyAccessBlockReason } from '../companies/company-access';

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

    // Password verification: bcrypt only. Passwords are hashed when written (UsersRepository),
    // so there is no plain-text or "interchangeable default password" path any more.
    const isValidPassword =
      !!user.password && /^\$2[aby]\$/.test(user.password) && bcrypt.compareSync(pass, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Company checks (not for platform superuser or platform-level clients):
    // the company must be approved by the platform admin and active.
    if (user.companyId && user.role !== 'superuser') {
      const reason = companyAccessBlockReason(this.companiesService.findOneOrNull(user.companyId));
      if (reason) throw new ForbiddenException(reason);
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

  /**
   * Public self-service signup for clients (people who want to post construction requirements).
   * Clients are platform-level users: no company, role fixed to "client".
   */
  registerClient(dto: RegisterClientDto) {
    const name = dto.name.trim();
    const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const created = this.usersService.create({
      name,
      email: dto.email.trim().toLowerCase(),
      password: dto.password,
      role: 'client',
      companyId: '',
      phone: dto.phone || '',
      avatar: initials,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    });
    const { password, ...safe } = created as any;
    return { message: 'Account created. You can now sign in.', user: safe };
  }
}
