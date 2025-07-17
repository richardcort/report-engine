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

  async create(reportData: CreateReportGeneratorDto): Promise<{statusCode: number; message: string; data: Buffer;}> {
    try {
      var { template, data } = reportData;

      this.data = data;
      this.template = template;
      console.log(this.template);
      this.templatePath = path.join(
        __dirname,
        '/..',
        '/templates/',
        `${this.template.name}.html`,
      );

      if (!fs.existsSync(this.templatePath)) {
        return {
          statusCode: 404,
          message: 'Template not found',
          data: null,
        };
      }

      this.htmlContent = fs.readFileSync(this.templatePath, 'utf8');
      
      await this.bm1();

      const pdfBuffer = await this.generatePdf();

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
      //console.log( this.htmlContent);

      let letraPorLinea = 115;
      let maxLinea = 28;
      let lineaCount = 0;
      let htmltable = ``;
      let total = 0;
      let tables: string[] = [];
      let page = 1;

      console.log('This length works' + this.data['inventory'].length);
      for (let i = 0; i < this.data['inventory'].length; i++) {
        // Calcular líneas que ocupa el item actual
        let cuenta = Math.ceil(
          this.data['inventory'][i].description.length / letraPorLinea,
        );

        console.log( 'this other length works' + this.data['inventory'][i].description.length);

        // Limitar a maxLinea para evitar página demasiado grande
        if (cuenta > maxLinea) {
          cuenta = maxLinea;
        }

        // Verificar si el item cabe en la página actual
        if (cuenta + lineaCount <= maxLinea) {
          // Si es la primera fila de la página, agregar encabezado "VIENEN..."
          if (lineaCount === 0 && i !== 0) {
            htmltable += `
        <tr>
          <th></th><th></th><th></th><th></th><th></th>
          <th width="65%" class="text-right">VIENEN...</th>
          <th width="5%">${this.formatNumberSpanish(total)}</th>
        </tr>
      `;
          }

          // Agregar fila con datos del item
          htmltable += `
      <tr>
        <td>${this.data['inventory'][i]['group_code']}</td>
        <td>${this.data['inventory'][i]['sub_group_code']}</td>
        <td>${this.data['inventory'][i]['section_code']}</td>
        <td>${this.data['inventory'][i]['quantity']}</td>
        <td>${this.data['inventory'][i]['identify_number']}</td>
        <td style="text-align: justify; padding-right: 5px;">${this.data['inventory'][i]['description']}</td>
        <td>${this.formatNumberSpanish(parseFloat(this.data['inventory'][i]['amount']))}</td>
      </tr>
    `;

          // Actualizar total y línea usadas
          total += this.data['inventory'][i]['amount'];
          lineaCount += cuenta + 1;

          // Si se llena la página, agregar fila "VAN..." y guardar página
          if (lineaCount > maxLinea) {
            let concatTotal =
              i === this.data['inventory'].length - 1 ? 'TOTAL...' : 'VAN...';
            htmltable += `
            
        <tr>
          <th colspan="6" class="text-right">${concatTotal}</th>
          <th width="5%">${this.formatNumberSpanish(total)}</th>
        </tr>
      `;
            tables.push(htmltable);
            htmltable = '';
            lineaCount = 0;
          }
        } else {
          //console.log(i, this.data['inventory'].length);
          let concatTotal =
            i === this.data['inventory'].length ? 'TOTAL...' : 'VAN...';
          // No cabe en la página actual, cerrar página y repetir item en la siguiente
          htmltable += `
      <tr>
        <th colspan="6" class="text-right">${concatTotal}</th>
        <th width="5%">${this.formatNumberSpanish(total)}</th>
      </tr>
    `;
          tables.push(htmltable);
          htmltable = '';
          lineaCount = 0;
          i -= 1; // Repetir este item en la siguiente página
        }
      }

      // Agregar última página si quedó contenido pendiente
      if (htmltable !== '') {
        //console.log('this the if ');
        htmltable += `
          <tr>
            <th colspan="6" class="text-right">TOTAL...</th>
            <th width="5%">${this.formatNumberSpanish(total)}</th>
          </tr>
        `;
        tables.push(htmltable);
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

