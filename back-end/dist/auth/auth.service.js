"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
const companies_service_1 = require("../companies/companies.service");
const bcrypt = __importStar(require("bcryptjs"));
let AuthService = class AuthService {
    usersService;
    companiesService;
    jwtService;
    constructor(usersService, companiesService, jwtService) {
        this.usersService = usersService;
        this.companiesService = companiesService;
        this.jwtService = jwtService;
    }
    async validateUser(email, pass) {
        const user = this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password.');
        }
        if (user.status === 'inactive') {
            throw new common_1.ForbiddenException('Account is locked or inactive. Please contact admin.');
        }
        let isValidPassword = false;
        if (user.password) {
            if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
                isValidPassword = bcrypt.compareSync(pass, user.password);
            }
            else if (user.password === pass) {
                isValidPassword = true;
                try {
                    const hashedPassword = bcrypt.hashSync(pass, 10);
                    user.password = hashedPassword;
                    this.usersService.update(user.id, { password: hashedPassword });
                }
                catch (e) {
                }
            }
        }
        if (!isValidPassword) {
            throw new common_1.UnauthorizedException('Invalid email or password.');
        }
        if (user.companyId && user.role !== 'superuser') {
            try {
                const company = this.companiesService.findOne(user.companyId);
                if (company && company.status === 'inactive') {
                    throw new common_1.ForbiddenException('Company workspace is inactive. Access denied.');
                }
            }
            catch (e) {
                if (e instanceof common_1.ForbiddenException)
                    throw e;
            }
        }
        return user;
    }
    async login(loginDto) {
        const user = await this.validateUser(loginDto.email, loginDto.password);
        const payload = {
            sub: user.id,
            role: user.role,
            companyId: user.companyId || '',
        };
        const token = this.jwtService.sign(payload);
        const { password, ...safeUser } = user;
        return {
            accessToken: token,
            user: safeUser,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        companies_service_1.CompaniesService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map