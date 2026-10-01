"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersRepository = void 0;
const common_1 = require("@nestjs/common");
let UsersRepository = class UsersRepository {
    memoryData = [
        {
            id: 'U000',
            name: 'Platform Admin',
            email: 'super@ch.com',
            password: '123456',
            role: 'superuser',
            companyId: '',
            phone: '+91 98000 00000',
            avatar: 'PA',
            status: 'active',
            createdAt: '2026-01-01',
        },
        {
            id: 'U001',
            name: 'Apex Admin',
            email: 'admin@apex.com',
            password: '123456',
            role: 'company_admin',
            companyId: 'COMP001',
            phone: '+91 98000 11111',
            avatar: 'AA',
            status: 'active',
            createdAt: '2026-01-01',
        },
        {
            id: 'U002',
            name: 'Rajesh Kumar',
            email: 'pm@apex.com',
            password: '123456',
            role: 'project_manager',
            companyId: 'COMP001',
            phone: '+91 98765 43210',
            avatar: 'RK',
            status: 'active',
            createdAt: '2026-01-05',
        },
        {
            id: 'U003',
            name: 'Priya Sharma',
            email: 'site@apex.com',
            password: '123456',
            role: 'site_engineer',
            companyId: 'COMP001',
            phone: '+91 98765 43211',
            avatar: 'PS',
            status: 'active',
            createdAt: '2026-01-06',
        },
        {
            id: 'U004',
            name: 'Amit Verma',
            email: 'finance@apex.com',
            password: '123456',
            role: 'finance_manager',
            companyId: 'COMP001',
            phone: '+91 98765 43212',
            avatar: 'AV',
            status: 'active',
            createdAt: '2026-01-07',
        },
        {
            id: 'U005',
            name: 'Vikram Patel',
            email: 'client@apex.com',
            password: '123456',
            role: 'client',
            companyId: 'COMP001',
            phone: '+91 98765 43213',
            avatar: 'VP',
            status: 'active',
            createdAt: '2026-01-10',
        },
        {
            id: 'U006',
            name: 'L&T Admin',
            email: 'admin@ltinfra.com',
            password: '123456',
            role: 'company_admin',
            companyId: 'COMP002',
            phone: '+91 98000 22222',
            avatar: 'LA',
            status: 'active',
            createdAt: '2026-01-15',
        },
        {
            id: 'U007',
            name: 'Sanjay Mehta',
            email: 'pm@ltinfra.com',
            password: '123456',
            role: 'project_manager',
            companyId: 'COMP002',
            phone: '+91 98765 88811',
            avatar: 'SM',
            status: 'active',
            createdAt: '2026-01-16',
        },
        {
            id: 'U008',
            name: 'Rohan Gupta',
            email: 'site@ltinfra.com',
            password: '123456',
            role: 'site_engineer',
            companyId: 'COMP002',
            phone: '+91 98765 88812',
            avatar: 'RG',
            status: 'active',
            createdAt: '2026-01-17',
        },
        {
            id: 'U009',
            name: 'Kavita Rao',
            email: 'finance@ltinfra.com',
            password: '123456',
            role: 'finance_manager',
            companyId: 'COMP002',
            phone: '+91 98765 88813',
            avatar: 'KR',
            status: 'active',
            createdAt: '2026-01-18',
        },
        {
            id: 'U010',
            name: 'Anand Mahindra',
            email: 'client@ltinfra.com',
            password: '123456',
            role: 'client',
            companyId: 'COMP002',
            phone: '+91 98765 88814',
            avatar: 'AM',
            status: 'active',
            createdAt: '2026-01-20',
        },
    ];
    findAll() {
        return this.memoryData;
    }
    findById(id) {
        return this.memoryData.find((user) => user.id === id);
    }
    findByEmail(email) {
        return this.memoryData.find((user) => user.email.toLowerCase() === email.toLowerCase());
    }
    findByCompanyId(companyId) {
        return this.memoryData.filter((user) => user.companyId === companyId);
    }
    create(user) {
        const id = `U${String(this.memoryData.length + 1).padStart(3, '0')}`;
        const newUser = { ...user, id };
        this.memoryData.push(newUser);
        return newUser;
    }
    update(id, partialUser) {
        const index = this.memoryData.findIndex((user) => user.id === id);
        if (index === -1)
            return null;
        this.memoryData[index] = { ...this.memoryData[index], ...partialUser };
        return this.memoryData[index];
    }
    remove(id) {
        const index = this.memoryData.findIndex((user) => user.id === id);
        if (index === -1)
            return false;
        this.memoryData.splice(index, 1);
        return true;
    }
};
exports.UsersRepository = UsersRepository;
exports.UsersRepository = UsersRepository = __decorate([
    (0, common_1.Injectable)()
], UsersRepository);
//# sourceMappingURL=users.repository.js.map