import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { CompaniesRepository } from '../companies/companies.repository';

describe('UsersService', () => {
  let service: UsersService;
  let companiesRepo: CompaniesRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, UsersRepository, CompaniesRepository],
    }).compile();

    service = module.get<UsersService>(UsersService);
    companiesRepo = module.get<CompaniesRepository>(CompaniesRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should reject creation with existing duplicate user email', () => {
      expect(() =>
        service.create({
          name: 'Duplicate Rajesh',
          email: 'admin@apex.com',
          password: '123456',
          role: 'project_manager',
          companyId: 'COMP001',
        }),
      ).toThrow(BadRequestException);
    });

    it('should allow creation with new email', () => {
      const user = service.create({
        name: 'New PM',
        email: 'newpm@apex.com',
        password: '123456',
        role: 'project_manager',
        companyId: 'COMP001',
      });
      expect(user).toBeDefined();
      expect(user.email).toBe('newpm@apex.com');
    });

    it('should reject creating user when tenant reaches plan userLimit and overage is disabled', () => {
      // Create a company on Basic plan (user limit 2 for testing)
      const comp = companiesRepo.create({
        name: 'Test Firm',
        code: 'tfirm',
        domain: 'tfirm.com',
        ownerEmail: 'admin@tfirm.com',
        plan: 'Basic',
        customUserLimit: 1,
        overageEnabled: false,
      });

      // Add 1st user (reaches limit 1/1)
      service.create({
        name: 'User 1',
        email: 'u1@tfirm.com',
        password: '123456',
        role: 'project_manager',
        companyId: comp.id,
      });

      // 2nd user attempt must fail with ForbiddenException
      expect(() =>
        service.create({
          name: 'User 2',
          email: 'u2@tfirm.com',
          password: '123456',
          role: 'site_engineer',
          companyId: comp.id,
        }),
      ).toThrow(ForbiddenException);
    });

    it('should allow creating user when tenant reaches plan userLimit if overage is enabled', () => {
      const comp = companiesRepo.create({
        name: 'Overage Firm',
        code: 'ofirm',
        domain: 'ofirm.com',
        ownerEmail: 'admin@ofirm.com',
        plan: 'Basic',
        customUserLimit: 1,
        overageEnabled: true,
      });

      service.create({
        name: 'User 1',
        email: 'u1@ofirm.com',
        password: '123456',
        role: 'project_manager',
        companyId: comp.id,
      });

      const user2 = service.create({
        name: 'User 2 (Overage)',
        email: 'u2@ofirm.com',
        password: '123456',
        role: 'site_engineer',
        companyId: comp.id,
      });

      expect(user2).toBeDefined();
      const updatedComp = companiesRepo.findById(comp.id!);
      expect(updatedComp?.extraUsers).toBe(1);
    });
  });

  describe('update', () => {
    it('should reject updating user email to another existing email', () => {
      expect(() =>
        service.update('U001', {
          email: 'admin@ltinfra.com',
        }),
      ).toThrow(BadRequestException);
    });

    it('should allow updating user with own email', () => {
      const updated = service.update('U001', {
        name: 'Apex Admin Updated',
        email: 'admin@apex.com',
      });
      expect(updated.name).toBe('Apex Admin Updated');
    });
  });
});

