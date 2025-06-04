import { Module } from '@nestjs/common';
import { ReportGeneratorService } from './report-generator.service';
import { ReportGeneratorController } from './report-generator.controller';

@Module({
  controllers: [ReportGeneratorController],
  providers: [ReportGeneratorService],
})
export class ReportGeneratorModule {}
