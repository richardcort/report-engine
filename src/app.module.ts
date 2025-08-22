import { Module } from '@nestjs/common';
import { ReportGeneratorModule } from './report-generator/report-generator.module';
import { ServeStaticModule } from '@nestjs/serve-static';

@Module({
  imports: [
    ReportGeneratorModule,
    ServeStaticModule.forRoot(
      {
        rootPath: './src/assets/images',
        serveRoot: '/images', 
      }
    ),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
