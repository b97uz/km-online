export type ParsedAnswer = {
  questionNumber: number;
  answer: string;
};

export type ParseResult = {
  parsed: ParsedAnswer[];
  byQuestion: string[];
};
