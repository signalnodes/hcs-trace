import type { MirrorMessage, MirrorTopicInfo, FetchPageResult } from "./types.js";

const MIRROR_BASES: Record<string, string> = {
  mainnet: "https://mainnet.mirrornode.hedera.com",
  testnet: "https://testnet.mirrornode.hedera.com",
  previewnet: "https://previewnet.mirrornode.hedera.com",
};

export function getMirrorBase(network: string): string {
  const base = MIRROR_BASES[network];
  if (!base) throw new Error(`Unknown network: "${network}". Use mainnet, testnet, or previewnet.`);
  return base;
}

async function mirrorFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (res.status === 404) throw new Error(`404: Not found — ${url}`);
  if (!res.ok) throw new Error(`Mirror Node error ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

export async function fetchTopicInfo(topicId: string, network: string): Promise<MirrorTopicInfo> {
  const base = getMirrorBase(network);
  return mirrorFetch<MirrorTopicInfo>(`${base}/api/v1/topics/${topicId}`);
}

export async function fetchPage(
  topicId: string,
  network: string,
  opts: {
    limit?: number;
    order?: "asc" | "desc";
    sequenceNumberGt?: number;
    cursor?: string | null; // links.next relative path
  } = {}
): Promise<FetchPageResult> {
  const base = getMirrorBase(network);

  let url: string;
  if (opts.cursor) {
    url = `${base}${opts.cursor}`;
  } else {
    const params = new URLSearchParams();
    params.set("limit", String(opts.limit ?? 25));
    params.set("order", opts.order ?? "asc");
    if (opts.sequenceNumberGt !== undefined) {
      params.set("sequencenumber", `gt:${opts.sequenceNumberGt}`);
    }
    url = `${base}/api/v1/topics/${topicId}/messages?${params}`;
  }

  const data = await mirrorFetch<{ messages: MirrorMessage[]; links: { next: string | null } }>(url);
  return {
    messages: data.messages ?? [],
    nextCursor: data.links?.next ?? null,
  };
}

export async function fetchAllMessages(
  topicId: string,
  network: string,
  opts: { limit?: number; fromSeq?: number; delayMs?: number } = {}
): Promise<MirrorMessage[]> {
  const all: MirrorMessage[] = [];
  let cursor: string | null = null;
  let first = true;

  while (true) {
    const page = await fetchPage(topicId, network, {
      limit: opts.limit ?? 100,
      order: "asc",
      cursor: cursor ?? undefined,
      sequenceNumberGt: first && opts.fromSeq !== undefined ? opts.fromSeq - 1 : undefined,
    });
    first = false;
    all.push(...page.messages);
    if (!page.nextCursor || page.messages.length === 0) break;
    cursor = page.nextCursor;
    if (opts.delayMs) await sleep(opts.delayMs);
  }

  return all;
}

export async function fetchTip(topicId: string, network: string): Promise<number> {
  const page = await fetchPage(topicId, network, { limit: 1, order: "desc" });
  return page.messages[0]?.sequence_number ?? 0;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
