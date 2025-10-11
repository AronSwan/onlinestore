import { Transport } from 'winston';

export interface OpenObserveTransportOptions {
  endpoint: string;
  token: string;
  batchSize?: number;
  flushInterval?: number;
  service?: string;
  maxRetries?: number;
  timeout?: number;
  staticLabels?: Record<string, any>;
}

export interface LogEntry {
  timestamp?: string;
  level?: string;
  message?: string;
  service?: string;
  [key: string]: any;
}

declare class OpenObserveTransport extends Transport {
  constructor(options: OpenObserveTransportOptions);
  log(entry: LogEntry, callback?: () => void): void;
  flush(): Promise<void>;
  close(): void;
}

export default OpenObserveTransport;
