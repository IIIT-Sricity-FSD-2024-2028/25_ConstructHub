import * as bcrypt from 'bcryptjs';
import { attachStore } from '../utils/json-store';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersRepository {
  constructor() {
    this.hashLegacyPasswords(); // hash seed passwords BEFORE the seed is first written to disk
    const seedCopy = this.memoryData.map((u) => ({ ...u }));
    attachStore('users', this.memoryData, () => this.memoryData, (v) => { this.memoryData = v; });
    this.hashLegacyPasswords();
    this.topUpSeedUsers(seedCopy);
  }

  private static isHash(value: string): boolean {
    return typeof value === 'string' && /^\$2[aby]\$/.test(value);
  }

  /** Seed accounts ship with plain-text passwords; hash them once on startup. */
  private hashLegacyPasswords(): void {
    for (const u of this.memoryData) {
      if (u.password && !UsersRepository.isHash(u.password)) {
        u.password = bcrypt.hashSync(u.password, 10);
      }
    }
  }

  private nextId(): string {
    const max = this.memoryData.reduce((m, u) => {
      const n = parseInt(String(u.id).replace(/\D/g, ''), 10);
      return /^U\d+$/.test(String(u.id)) && Number.isFinite(n) && n > m ? n : m;
    }, 0);
    return `U${String(max + 1).padStart(3, '0')}`;
  }

  private memoryData: any[] = [
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
    // Apex Builders (COMP001 - @apex.com)
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
      companyId: '',
      invitedByCompanyId: 'COMP001',
      phone: '+91 98765 43213',
      avatar: 'VP',
      status: 'active',
      createdAt: '2026-01-10',
    },
    // L&T Construction (COMP002 - @ltinfra.com)
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
      companyId: '',
      invitedByCompanyId: 'COMP002',
      phone: '+91 98765 88814',
      avatar: 'AM',
      status: 'active',
      createdAt: '2026-01-20',
    },
    {
      id: 'U011',
      name: 'Suresh Shah',
      email: 'client2@apex.com',
      password: 'password123',
      role: 'client',
      companyId: '',
      invitedByCompanyId: 'COMP001',
      phone: '+91 98765 43219',
      avatar: 'SS',
      status: 'active',
      createdAt: '2026-01-22',
    },
    {
      id: 'U012',
      name: 'Sunil Nair',
      email: 'proc@apex.com',
      password: '123456',
      role: 'procurement_storekeeper',
      companyId: 'COMP001',
      phone: '+91 98765 43220',
      avatar: 'SN',
      status: 'active',
      createdAt: '2026-01-12',
    },
    {
      id: 'U013',
      name: 'Deepa Menon',
      email: 'proc@ltinfra.com',
      password: '123456',
      role: 'procurement_storekeeper',
      companyId: 'COMP002',
      phone: '+91 98765 88820',
      avatar: 'DM',
      status: 'active',
      createdAt: '2026-01-20',
    },
  ];

  /**
   * Seed accounts added after a data/db folder was already saved (e.g. the Procurement/Storekeeper
   * users of Day 5) are appended once, matched by e-mail, so nobody has to reset their data.
   */
  private static readonly SEED_TOP_UP_IDS = ['U012', 'U013'];
  private topUpSeedUsers(defaults: any[]): void {
    for (const id of UsersRepository.SEED_TOP_UP_IDS) {
      const seed = defaults.find((u) => u.id === id);
      if (seed && !this.memoryData.some((u) => u.email === seed.email)) {
        // keep ids unique even if a saved file already used this id for someone else
        const idTaken = this.memoryData.some((u) => u.id === seed.id);
        this.memoryData.push({ ...seed, id: idTaken ? this.nextId() : seed.id, password: seed.password });
      }
    }
    this.hashLegacyPasswords();
  }

  findAll(): any[] {
    return this.memoryData;
  }

  findById(id: string): any {
    return this.memoryData.find((user) => user.id === id);
  }

  findByEmail(email: string): any {
    return this.memoryData.find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  findByCompanyId(companyId: string): any[] {
    return this.memoryData.filter((user) => user.companyId === companyId);
  }

  create(user: any): any {
    const id = this.nextId();
    const newUser = { ...user, id };
    if (newUser.password && !UsersRepository.isHash(newUser.password)) {
      newUser.password = bcrypt.hashSync(newUser.password, 10);
    }
    this.memoryData.push(newUser);
    return newUser;
  }

  update(id: string, partialUser: any): any {
    const index = this.memoryData.findIndex((user) => user.id === id);
    if (index === -1) return null;
    const next = { ...this.memoryData[index], ...partialUser };
    if (next.password && !UsersRepository.isHash(next.password)) {
      next.password = bcrypt.hashSync(next.password, 10);
    }
    this.memoryData[index] = next;
    return this.memoryData[index];
  }

  remove(id: string): boolean {
    const index = this.memoryData.findIndex((user) => user.id === id);
    if (index === -1) return false;
    this.memoryData.splice(index, 1);
    return true;
  }
}