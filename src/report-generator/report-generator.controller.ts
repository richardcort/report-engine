import { Controller, Post, Body } from '@nestjs/common';
import { ReportGeneratorService } from './report-generator.service';
import { technicalReportDto } from './dto/report-generator.dto';

@Controller('report-generator')
export class ReportGeneratorController {
  constructor(private readonly reportGeneratorService: ReportGeneratorService) {}

  @Post()
  create(@Body() createReportGeneratorDto: technicalReportDto) {
    return this.reportGeneratorService.create(createReportGeneratorDto);
  }
}