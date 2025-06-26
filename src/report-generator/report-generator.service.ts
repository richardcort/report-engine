import { Injectable } from '@nestjs/common';
import { CreateReportGeneratorDto } from './dto/report-generator.dto';
import * as path from 'path';
import * as fs from 'fs';
import * as wkhtmltopdf from 'wkhtmltopdf';

@Injectable()
export class ReportGeneratorService {
  async create(reportData: CreateReportGeneratorDto) {
    try {
      let { template, data } = reportData;

      const templatePath: string = path.join(
        __dirname,
        '/..',
        '/templates/',
        template + '.html',
      );

      if (!fs.existsSync(templatePath)) {
        return {
          statusCode: 404,
          message: 'Template not found',
          data: null,
        };
      }

      let htmlContent: string = fs.readFileSync(templatePath, 'utf8');

      Object.keys(data).forEach((key) => {
        htmlContent = this.processDataKey(htmlContent, key, data[key]);
      });

      const pdfStream = wkhtmltopdf(htmlContent);
      const pdfBuffer = await this.streamToBuffer(pdfStream);

      return {
        statusCode: 200,
        message: 'PDF generated successfully',
        data: pdfBuffer,
      };
    } catch (error) {
      console.error('Error creating report generator:', error);
      throw new Error('Failed to create report generator');
    }
  }

  private processDataKey(htmlContent: string, key: string, value: any) {
    if (Array.isArray(value) && htmlContent.includes(`<data-${key} />`)) {
      return this.replaceHtmlTags(
        htmlContent,
        key,
        this.arrayToHtmlRows(value),
      );
    }
    if (typeof value === 'object' && value !== null) {
      return this.processNestedObject(htmlContent, key, value);
    }
    return this.replaceHtmlTags(htmlContent, key, value);
  }

  private processNestedObject(
    htmlContent: string,
    key: string,
    nestedObject: object,
  ) {
    Object.entries(nestedObject).forEach(([subKey, subValue]) => {
      htmlContent = this.replaceHtmlTags(
        htmlContent,
        `${key}-${subKey}`,
        subValue,
      );
    });
    return htmlContent;
  }

  private replaceHtmlTags(htmlContent: string, key: string, value: any) {
    return (htmlContent = htmlContent.replace(`<data-${key} />`, `${value}`));
  }

  private arrayToHtmlRows(array: any[]) {
    if (!array.length) return '';

    let rows = array
      .map(
        (item) =>
          `<tr>
                ${Object.values(item).map((value) => `<td>${value}</td>`).join('')}
          </tr>`,
      )
      .join('');

    return rows;
  }

  private async streamToBuffer(readbleStream: ReadableStream) {
    const chunks = [];

    for await (const chunk of readbleStream) chunks.push(chunk);

    return Buffer.concat(chunks);
  }
}
