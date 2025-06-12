import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportGeneratorService } from './report-generator.service';
import { CreateReportGeneratorDto } from './dto/report-generator.dto';

@Controller('report-generator')
export class ReportGeneratorController {
  constructor(
    private readonly reportGeneratorService: ReportGeneratorService,
  ) {}

  @Post()
  async create(@Body() createReportGeneratorDto: CreateReportGeneratorDto, @Res() res: Response) {
    const pdfBuffer = await this.reportGeneratorService.create(createReportGeneratorDto);

    if (pdfBuffer.data) {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=report.pdf',
        'Content-Length':  pdfBuffer.data.length,
      });

      return res.send(pdfBuffer.data);
    }

   return res.status(pdfBuffer.statusCode).send(pdfBuffer.message); 
  }
}