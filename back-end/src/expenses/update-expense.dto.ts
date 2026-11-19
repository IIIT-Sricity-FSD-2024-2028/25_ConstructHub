import { PartialType } from '@nestjs/swagger';
import { CreateExpenseDto } from './create-expense.dto';

/** Used by the site engineer to correct a returned expense before resubmitting it. */
export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
