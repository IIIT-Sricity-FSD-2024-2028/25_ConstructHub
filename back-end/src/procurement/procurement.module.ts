import { Module, forwardRef } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';
import { TasksModule } from '../tasks/tasks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MilestonesModule } from '../milestones/milestones.module';
import { ProcurementService } from './procurement.service';
import {
  SuppliersController, MaterialRequestsController, PurchaseOrdersController, GoodsReceiptsController,
  StockController, ProcurementSettingsController,
} from './procurement.controllers';
import {
  SuppliersRepository, MaterialRequestsRepository, PurchaseOrdersRepository, GoodsReceiptsRepository,
  StockRepository, ProcurementSettingsRepository,
} from './procurement.repositories';

@Module({
  imports: [ProjectsModule, UsersModule, forwardRef(() => TasksModule), NotificationsModule, forwardRef(() => MilestonesModule)],
  controllers: [SuppliersController, MaterialRequestsController, PurchaseOrdersController, GoodsReceiptsController, StockController, ProcurementSettingsController],
  providers: [
    ProcurementService, SuppliersRepository, MaterialRequestsRepository, PurchaseOrdersRepository,
    GoodsReceiptsRepository, StockRepository, ProcurementSettingsRepository,
  ],
  exports: [ProcurementService, PurchaseOrdersRepository, GoodsReceiptsRepository, StockRepository, MaterialRequestsRepository],
})
export class ProcurementModule {}
