// lib/scraper/cost.ts
// Token usage accumulator + USD cost calculator for scraper runs.
// All prices in USD per 1M tokens (OpenAI public pricing as of 2026-Q1).

const PRICING = {
  parser: { input: 0.15, output: 0.6 }, // gpt-4o-mini
  classifier: { input: 0.15, output: 0.6 }, // gpt-4o-mini
  embedding: { input: 0.02, output: 0 }, // text-embedding-3-small
};

export interface TokenUsage {
  parser_input_tokens: number;
  parser_output_tokens: number;
  classifier_input_tokens: number;
  classifier_output_tokens: number;
  embedding_input_tokens: number;
  total_usd_cents: number;
}

export function emptyUsage(): TokenUsage {
  return {
    parser_input_tokens: 0,
    parser_output_tokens: 0,
    classifier_input_tokens: 0,
    classifier_output_tokens: 0,
    embedding_input_tokens: 0,
    total_usd_cents: 0,
  };
}

export function addParser(u: TokenUsage, input: number, output: number) {
  u.parser_input_tokens += input;
  u.parser_output_tokens += output;
  u.total_usd_cents += centsFor(input, PRICING.parser.input);
  u.total_usd_cents += centsFor(output, PRICING.parser.output);
}

export function addClassifier(u: TokenUsage, input: number, output: number) {
  u.classifier_input_tokens += input;
  u.classifier_output_tokens += output;
  u.total_usd_cents += centsFor(input, PRICING.classifier.input);
  u.total_usd_cents += centsFor(output, PRICING.classifier.output);
}

export function addEmbedding(u: TokenUsage, input: number) {
  u.embedding_input_tokens += input;
  u.total_usd_cents += centsFor(input, PRICING.embedding.input);
}

function centsFor(tokens: number, dollarsPerMillion: number): number {
  // Result in cents (1 USD = 100 cents).
  return (tokens / 1_000_000) * dollarsPerMillion * 100;
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(4)}`;
}
