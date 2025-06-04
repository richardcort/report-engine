import { PickType } from "@nestjs/mapped-types";
import { ReportGenerator } from "../entities/report-generator.entity";

export class CreateReportGeneratorDto {}

export class technicalReportDto extends PickType(ReportGenerator, [
  'date',
  'correlative',
  'for',
  'to',
  'sealNumberDigits',
  'sealNumberLetters',
  'sealColor',
  'bm',
  'serials',
  'bmDescription',
  'condtionStatus',
  'degradationLevel',
  'diagnostics',
  'observation',
]) {}
