export class ReportGenerator {
  date: Date;
  correlative: string;
  for: string;
  to: string;
  sealNumberDigits: {
    nd1: number;
    nd2: number;
    nd3: number;
    nd4: number;
    nd5: number;
  };
  sealNumberLetters: {
    nl1: string;
    nl2: string;
    nl3: string;
    nl4: string;
    nl5: string;
  };
  sealColor: string;
  bm: string;
  serials: [
    {
      name: string;
      sereal: string;
    },
  ];
  bmDescription: string;
  condtionStatus: boolean;
  degradationLevel: boolean;
  diagnostics: string;
  observation: string;
}