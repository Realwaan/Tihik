export type PiiEntity = {
  start: number;
  end: number;
  label: string;
  text: string;
  score: number | null;
};

export type ParsedPiiEntity = {
  label: string;
  text: string;
  score: number | null;
};

export type PiiDetectionResult = {
  entities: PiiEntity[];
  warning?: string;
};
