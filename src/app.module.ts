import { Module } from '@nestjs/common';
import { ReportGeneratorModule } from './report-generator/report-generator.module';

@Module({
  imports: [ReportGeneratorModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
