import { Module } from '@nestjs/common';
import { BillsService } from './bills.service';
import { BillsController } from './bills.controller';
import { BillsRepository } from './bills.repository';

@Module({
  controllers: [BillsController],
  providers: [BillsService, BillsRepository],
})
export class BillsModule {}