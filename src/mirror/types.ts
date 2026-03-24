export interface MirrorMessage {
  chunk_info: {
    initial_transaction_id: {
      account_id: string;
      nonce: number;
      scheduled: boolean;
      transaction_valid_start: string;
    };
    number: number;
    total: number;
  };
  consensus_timestamp: string; // "1772141208.837294000" — seconds.nanos
  message: string;             // base64-encoded payload
  payer_account_id: string;
  running_hash: string;
  running_hash_version: number;
  sequence_number: number;
  topic_id: string;
}

export interface MirrorTopicInfo {
  admin_key: null | { key: string; _type: string };
  auto_renew_account: string;
  auto_renew_period: number;
  created_timestamp: string;
  deleted: boolean;
  memo: string;
  submit_key: null | { key: string; _type: string };
  timestamp: { from: string; to: string | null };
  topic_id: string;
}

export interface FetchPageResult {
  messages: MirrorMessage[];
  nextCursor: string | null;
}
