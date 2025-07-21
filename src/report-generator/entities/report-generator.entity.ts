export class ReportGenerator {
  template: {
    name: string;
    format: string;
    landscape: boolean;
    margin: {
      top: string;
      right: string;
      bottom: string;
      left: string;
    };
  }; 
  data: object;
}