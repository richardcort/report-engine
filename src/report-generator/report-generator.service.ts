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
      htmlContent = this.replaceHtmlTags(htmlContent, data);

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

  private replaceHtmlTags(htmlContent: string, data: any) {
    Object.keys(data).forEach((key) => {
      if (Array.isArray(data[key])) {
        let table = this.arrayToHtmlTable(data[key]);
        htmlContent = htmlContent.replace(`<data-table-${key} />`, table);
      } else {
        htmlContent = htmlContent.replace(`<data-${key} />`, `${data[key]}`);
      }
    });

    return htmlContent;
  }

  private arrayToHtmlTable(array: any[]) {
    if (!array.length) return '';

    let headers = `
      <thead>
        <tr>
          ${Object.keys(array[0])
            .map((key) => `<th>${key}</th>`)
            .join('')}
        </tr>
      </thead>`;

    let rows = `
      <tbody>
        ${array
          .map(
            (item) =>
              `<tr>${Object.values(item)
                .map((value) => `<td>${value}</td>`)
                .join('')}</tr>`,
          )
          .join('')}
      </tbody>`;

    const table = `
      <table>
        ${headers}
        ${rows}
      </table>`;

    return table;
  }

  private async streamToBuffer(readbleStream: ReadableStream) {
    const chunks = [];

    for await (const chunk of readbleStream) chunks.push(chunk);

    return Buffer.concat(chunks);
  }
}
