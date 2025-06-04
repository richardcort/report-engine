import { Injectable } from '@nestjs/common';
import { CreateReportGeneratorDto, technicalReportDto } from './dto/report-generator.dto';
import * as wkhtmltopdf from 'wkhtmltopdf';
import * as fs from 'fs';

@Injectable()
export class ReportGeneratorService {
  create(data: technicalReportDto) {
    try {
      const htmlContent = fs.readFileSync('./src/templates/technical-report.html', 'utf8');
      console.log(htmlContent);
      
      return 'This action adds a new reportGenerator';
    } catch (error) {
      console.error('Error creating report generator:', error);
      throw new Error('Failed to create report generator');
    }
  }
}
