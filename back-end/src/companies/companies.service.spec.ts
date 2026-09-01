import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesRepository } from './companies.repository';
import { UsersRepository } from '../users/users.repository';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let repo: CompaniesRepository;
  let usersRepo: UsersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompaniesService, CompaniesRepository, UsersRepository],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    repo = module.get<CompaniesRepository>(CompaniesRepository);
    usersRepo = module.get<UsersRepository>(UsersRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new company successfully', () => {
      const newComp = service.create({
        name: 'New Build Corp',
        code: 'newbuild',
        domain: 'newbuild.com',
        ownerEmail: 'admin@newbuild.com',
      });
      expect(newComp).toBeDefined();
      expect(newComp.code).toBe('newbuild');
    });

    it('should reject creation with existing code', () => {
      expect(() =>
        service.create({
          name: 'Apex Duplicate',
          code: 'apex',
          domain: 'apexdup.com',
          ownerEmail: 'admin@apexdup.com',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject creation with existing domain', () => {
      expect(() =>
        service.create({
          name: 'Apex Domain Duplicate',
          code: 'apexdup',
          domain: 'apex.com',
          ownerEmail: 'admin@apex.com',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject creation with existing owner email', () => {
      expect(() =>
        service.create({
          name: 'Apex Email Duplicate',
          code: 'apexdup2',
          domain: 'apexdup2.com',
          ownerEmail: 'admin@apex.com',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject creation if owner email domain does not match company domain', () => {
      expect(() =>
        service.create({
          name: 'Mismatch Firm',
          code: 'mismatch',
          domain: 'mismatch.com',
          ownerEmail: 'admin@otherdomain.com',
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should reject updating to an existing domain of another company', () => {
      expect(() =>
        service.update('COMP001', {
          domain: 'ltinfra.com',
        }),
      ).toThrow(BadRequestException);
    });

    it('should reject updating to an existing owner email of another company', () => {
      expect(() =>
        service.update('COMP001', {
          ownerEmail: 'admin@ltinfra.com',
        }),
      ).toThrow(BadRequestException);
    });

    it('should allow updating company details with own domain and matching email', () => {
      const updated = service.update('COMP001', {
        name: 'Apex Builders Renewed',
        ownerEmail: 'admin@apex.com',
      });
      expect(updated.name).toBe('Apex Builders Renewed');
    });
  });
});
