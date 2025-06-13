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

      const outputPath = path.join(__dirname, 'output.pdf');
      fs.writeFileSync(outputPath, pdfBuffer);
      console.log(`PDF guardado en: ${outputPath}`);

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
    if (typeof value === 'object' && value !== null) {
      console.log('Object detected');
      return this.processNestedObject(htmlContent, value);
    }
    return this.replaceHtmlTags(htmlContent, key, value);
  }

  private processNestedObject(htmlContent: string, nestedObject: object) {
    Object.entries(nestedObject).forEach(([subKey, subValue]) => {
      htmlContent  = this.replaceHtmlTags(htmlContent, subKey, subValue);
    });
    return htmlContent;
  }

  private replaceHtmlTags(htmlContent: string, key: string, value: any) {
    return htmlContent = htmlContent.replace(`<data-${key} />`, `${value}`);;
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
