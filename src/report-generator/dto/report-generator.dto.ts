import { PickType } from '@nestjs/mapped-types';
import { ReportGenerator } from '../entities/report-generator.entity';

export class CreateReportGeneratorDto extends PickType(ReportGenerator, [
  'template',
  'data',
]) {}
