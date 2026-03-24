/** Convert Mirror Node consensus_timestamp ("1772141208.837294000") to Date */
export function timestampToDate(ts: string): Date {
  return new Date(parseFloat(ts) * 1000);
}

/** Format a Mirror Node consensus_timestamp as a readable UTC string */
export function formatTimestamp(ts: string): string {
  return timestampToDate(ts).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}
