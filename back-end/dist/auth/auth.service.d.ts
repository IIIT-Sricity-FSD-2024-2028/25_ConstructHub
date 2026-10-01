import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { LoginDto } from './login.dto';
export declare class AuthService {
    private readonly usersService;
    private readonly companiesService;
    private readonly jwtService;
    constructor(usersService: UsersService, companiesService: CompaniesService, jwtService: JwtService);
    validateUser(email: string, pass: string): Promise<any>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        user: any;
    }>;
}
