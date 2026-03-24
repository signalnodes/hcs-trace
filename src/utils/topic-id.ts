export function normalizeTopic(input: string): string {
  if (/^\d+\.\d+\.\d+$/.test(input)) return input;
  if (/^\d+$/.test(input)) return `0.0.${input}`;
  throw new Error(`Invalid topic ID: "${input}". Use format 0.0.XXXXX or just the number.`);
}
