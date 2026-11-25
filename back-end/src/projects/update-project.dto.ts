import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

/** `spent` is never edited by hand: the server keeps it equal to the approved expenses. */
export class UpdateProjectDto extends PartialType(OmitType(CreateProjectDto, ['spent'] as const)) {}
