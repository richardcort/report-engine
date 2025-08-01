import { Injectable } from '@nestjs/common';
import { CreateReportGeneratorDto } from './dto/report-generator.dto';
import * as path from 'path';
import * as fs from 'fs';
import puppeteer from 'puppeteer';

@Injectable()
export class ReportGeneratorService {
  protected htmlContent: string = '';
  private data: object;
  private templatePath: string;
  private template: any;

  async create(
    reportData: CreateReportGeneratorDto,
  ): Promise<{ statusCode: number; message: string; data: Buffer }> {
    try {
      var { template, data } = reportData;
      this.data = data;
      this.template = template;
      this.templatePath = path.join(__dirname, '/..', '/templates/', `${template.name}.html`);

      if (!fs.existsSync(this.templatePath)) {
        return {
          statusCode: 404,
          message: 'Template not found',
          data: null,
        };
      }

      this.htmlContent = fs.readFileSync(this.templatePath, 'utf8');

      switch (this.template.name) {
        case 'bm2':
          await this.bm2();
          break;
        case 'internal-transfer':
          await this.internalTransfer();
          break;
        case 'general-inventory-of-assets':
          await this.bm1();
          break;
        default:
          break;
      }

      let pdfBuffer = await this.generatePdf();

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

  private async generatePdf() {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    await page.setContent(this.htmlContent, { waitUntil: 'networkidle0' });

    delete this.template.name;
    const pdfBuffer = await page.pdf(this.template);

    await browser.close();

    return Buffer.from(pdfBuffer);
  }

  private processDataKey(key: string, value: any): void {
    if (typeof value === 'object' && value !== null)
      this.processNestedObject(key, value);
    else this.replaceHtmlTags(key, value);
  }

  private processNestedObject(key: string, nestedObject: object): void {
    Object.entries(nestedObject).forEach(([subKey, subValue]) => {
      this.replaceHtmlTags(`${key}-${subKey}`, subValue);
    });
  }

  private replaceHtmlTags(key: string, value: any): void {
    const regexKey = new RegExp(`<data-${key} />`, 'g');
    this.htmlContent = this.htmlContent.replace(regexKey, `${value}`);
  }

  private formatNumberSpanish(number: number): string {
    return number.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private bm1(): void {
    const tempTemplate = '<br>' + fs.readFileSync(this.templatePath, 'utf8');

    this.htmlContent = this.htmlContent.replace(
      `<data-inventory />`,
      `<data-inventory-0 />`,
    );

    let lettrePerLine = 115;
    let maxLine = 28;
    let lineCounter = 0;
    let htmlTable = ``;
    let total = 0;
    let tables: string[] = [];

    for (let i = 0; i < this.data['inventory'].length; i++) {
      let count = Math.ceil(
        this.data['inventory'][i].description.length / lettrePerLine,
      );

      if (count > maxLine) {
        count = maxLine;
      }

      if (count + lineCounter <= maxLine) {
        if (lineCounter === 0 && i !== 0) {
          htmlTable += `
        <tr>
          <th></th><th></th><th></th><th></th><th></th>
          <th width="65%" class="text-right">VIENEN...</th>
          <th width="5%">${this.formatNumberSpanish(total)}</th>
        </tr>
      `;
        }

        htmlTable += `
      <tr>
        <td>${this.data['inventory'][i]['group_code']}</td>
        <td>${this.data['inventory'][i]['sub_group_code']}</td>
        <td>${this.data['inventory'][i]['section_code']}</td>
        <td>1</td>
        <td>${this.data['inventory'][i]['identify_number']}</td>
        <td style="text-align: justify; padding-right: 5px;">${this.data['inventory'][i]['description']}</td>
        <td>${this.formatNumberSpanish(parseFloat(this.data['inventory'][i]['amount']))}</td>
      </tr>
    `;

        total += this.data['inventory'][i]['amount'];
        lineCounter += count + 1;

        if (lineCounter > maxLine) {
          let concatTotal =
            i === this.data['inventory'].length - 1 ? 'TOTAL...' : 'VAN...';
          htmlTable += `
            
        <tr>
          <th colspan="6" class="text-right">${concatTotal}</th>
          <th width="5%">${this.formatNumberSpanish(total)}</th>
        </tr>
      `;
          tables.push(htmlTable);
          htmlTable = '';
          lineCounter = 0;
        }
      } else {
        let concatTotal =
          i === this.data['inventory'].length ? 'TOTAL...' : 'VAN...';
        htmlTable += `
      <tr>
        <th colspan="6" class="text-right">${concatTotal}</th>
        <th width="5%">${this.formatNumberSpanish(total)}</th>
      </tr>
    `;
        tables.push(htmlTable);
        htmlTable = '';
        lineCounter = 0;
        i -= 1;
      }
    }

    if (htmlTable !== '') {
      htmlTable += `
          <tr>
            <th colspan="6" class="text-right">TOTAL...</th>
            <th width="5%">${this.formatNumberSpanish(total)}</th>
          </tr>
        `;
      tables.push(htmlTable);
    }

    for (let i = 1; i < tables.length; i++) {
      this.htmlContent += tempTemplate.replace(
        `<data-inventory />`,
        `<data-inventory-${i} />`,
      );
    }

    for (let i = 0; i < tables.length; i++) {
      this.htmlContent = this.htmlContent.replace(
        `<pag />`,
        `Pag. ${i + 1}/${tables.length}`,
      );
    }

    tables.forEach((table, index) => {
      this.replaceHtmlTags(`inventory-${index}`, table);
    });

    Object.keys(this.data).forEach((key) => {
      this.processDataKey(key, this.data[key]);
    });
  }

  private internalTransfer(): void {
    let tempTemplate = fs.readFileSync(this.templatePath, 'utf8');

    this.htmlContent = this.htmlContent.replace(
      `<data-inventory />`,
      `<data-inventory-0 />`,
    );

    let letterPerLine = 115;
    let maxLine = 32;
    let lineCounter = 0;

    let htmlTable = ``;
    let total = 0;

    let tables: string[] = [];

    for (let i = 0; i < this.data['inventory'].length; i++) {
      let account = Math.ceil(
        this.data['inventory'][i].description.length / letterPerLine,
      );

      if (account > maxLine) {
        account = maxLine;
      }

      if (account + lineCounter <= maxLine) {
        if (lineCounter === 0 && i !== 0) {
          htmlTable += `
            <tr>
              <th colspan="6">
                <p>VIENEN...</p>
              </th>
              <th>
                ${this.formatNumberSpanish(total)}
              </th>
            </tr>`;
        }

        htmlTable += `
        <tr>
          <td>${this.data['inventory'][i]['group_code']}</td>
          <td>${this.data['inventory'][i]['sub_group_code']}</td>
          <td>${this.data['inventory'][i]['section_code']}</td>
          <td>1</td>
          <td>${this.data['inventory'][i]['identify_number']}</td>
          <td>${this.data['inventory'][i]['description'].toUpperCase()}</td>
          <td>${this.formatNumberSpanish(parseFloat(this.data['inventory'][i]['amount']))}</td>
        </tr>
      `;

        total += this.data['inventory'][i]['amount'];
        lineCounter += account + 1;

        if (lineCounter > maxLine) {
          let concatTotal =
            i === this.data['inventory'].length - 1 ? 'TOTAL...' : 'VAN...';
          htmlTable += `
            <tr>
              <th colspan="6">
                ${concatTotal}
              </th>
              <th>
                ${this.formatNumberSpanish(total)}
              </th>
            </tr>
          `;

          tables.push(htmlTable);
          htmlTable = '';
          lineCounter = 0;
        }
      } else {
        let concatTotal =
          i === this.data['inventory'].length ? 'TOTAL...' : 'VAN...';
        htmlTable += `
            <tr>
              <th colspan="6">
                ${concatTotal}
              </th>
              <th>
                ${this.formatNumberSpanish(total)}
              </th>
            </tr>
          `;

        tables.push(htmlTable);
        htmlTable = '';
        lineCounter = 0;
        i -= 1;
      }
    }

    if (htmlTable !== '') {
      htmlTable += `
        <tr>
            <th colspan="6">
              TOTAL...
            </th>
            <th>
              ${this.formatNumberSpanish(total)}
            </th>
          </tr>
      `;
      tables.push(htmlTable);
    }

    for (let i = 1; i < tables.length; i++) {
      this.htmlContent += tempTemplate.replace(
        `<data-inventory />`,
        `<data-inventory-${i} />`,
      );
    }

    for (let i = 0; i < tables.length; i++) {
      this.htmlContent = this.htmlContent.replace(
        `<pag />`,
        `Pag. ${i + 1}/${tables.length}`,
      );
    }

    tables.forEach((table, index) => {
      this.replaceHtmlTags(`inventory-${index}`, table);
    });

    Object.keys(this.data).forEach((key) => {
      this.processDataKey(key, this.data[key]);
    });
  }

  private bm2() {
    const motion_concept = this.data['motionConcept'];
    const tempTemplate = fs.readFileSync(this.templatePath, 'utf8');

    this.htmlContent = this.htmlContent.replace(
      `<data-inventory />`,
      `<data-inventory-0 />`,
    );

    let letterPerLine = 75;
    let maxLine = 34;
    let lineCounter = 0;
    let total = 0;
    let tables: string[] = [];
    let isIncorporation =
      this.data['motionConcept'] >= 1 && this.data['motionConcept'] < 51;

    let htmlTable = ``;
    for (let i = 0; i < this.data['inventory'].length; i++) {
      let cellAmount = isIncorporation
        ? `<td>${this.formatNumberSpanish(parseFloat(this.data['inventory'][i]['amount']))}</td><td></td>`
        : `<td></td><td>${this.formatNumberSpanish(parseFloat(this.data['inventory'][i]['amount']))}</td>`;

      let count = Math.ceil(
        this.data['inventory'][i].description.length / letterPerLine,
      );

      if (count > maxLine) {
        count = maxLine;
      }

      if (count + lineCounter <= maxLine) {
        if (lineCounter === 0 && i !== 0) {
          htmlTable += `
            <tr>
              <th colspan="8">VIENEN...</th>
              ${isIncorporation ? '' : `<th></th>`}
              <th colspan="1">${this.formatNumberSpanish(total)}</th>
              ${isIncorporation ? `<th></th>` : ''}
              </tr>
              `;
        }

        htmlTable += `
      <tr>
        <td>${this.data['inventory'][i]['group_code']}</td>
        <td>${this.data['inventory'][i]['sub_group_code']}</td>
        <td>${this.data['inventory'][i]['section_code']}</td>
        <td>${motion_concept}</td>
        <td>1</td>
        <td>${this.data['inventory'][i]['identify_number']}</td>
        <td colspan="2">${this.data['inventory'][i]['description'].toUpperCase()}</td>
        ${cellAmount}
      </tr>
    `;

        total += this.data['inventory'][i]['amount'];
        lineCounter += count + 1;

        if (lineCounter > maxLine) {
          let concatTotal =
            i === this.data['inventory'].length - 1 ? 'TOTAL...' : 'VAN...';
          htmlTable += `
            <tr>
            <th colspan="8">${concatTotal}</th>
            ${isIncorporation ? '' : `<th></th>`}
              <th colspan="1">${this.formatNumberSpanish(total)}</th>
              ${isIncorporation ? '<th></th>' : ''}
            </tr>
            `;
          tables.push(htmlTable);
          htmlTable = '';
          lineCounter = 0;
        }
      } else {
        let concatTotal =
          i === this.data['inventory'].length ? 'TOTAL...' : 'VAN...';
        htmlTable += `
            <tr>
            <th colspan="8" >${concatTotal}</th>
            ${isIncorporation ? '' : `<th></th>`}
              <th colspan="1">${this.formatNumberSpanish(total)}</th>
              ${isIncorporation ? '<th></th>' : ''}
            </tr>
            `;

        tables.push(htmlTable);
        htmlTable = '';
        lineCounter = 0;
        i -= 1;
      }
    }

    if (htmlTable !== '') {
      htmlTable += `
        <tr>
            <th colspan="8">TOTAL...</th>
            ${isIncorporation ? '' : `<th></th>`}
              <th colspan="1">${this.formatNumberSpanish(total)}</th>
              ${isIncorporation ? '<th></th>' : ''}
            </tr>
            `;
      tables.push(htmlTable);
    }

    for (let i = 1; i < tables.length; i++) {
      this.htmlContent += tempTemplate.replace(
        `<data-inventory />`,
        `<data-inventory-${i} />`,
      );
    }

    for (let i = 0; i < tables.length; i++) {
      this.htmlContent = this.htmlContent.replace(
        `<pag />`,
        `Pag. ${i + 1}/${tables.length}`,
      );
    }

    tables.forEach((table, index) => {
      this.replaceHtmlTags(`inventory-${index}`, table);
    });

    Object.keys(this.data).forEach((key) => {
      this.processDataKey(key, this.data[key]);
    });
  }
}
