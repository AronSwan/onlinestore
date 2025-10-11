import axios from 'axios';

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

/**
 * Minimal OpenObserve transport implementation.
 * Batches logs and posts JSON to the configured endpoint.
 */
export default class OpenObserveTransport {
  private endpoint: string;
  private token: string;
  private batchSize: number;
  private flushInterval: number;
  private service: string;
  private timeout: number;
  private staticLabels?: Record<string, any>;
  private queue: LogEntry[] = [];
  private timer?: NodeJS.Timeout;

  constructor(options: OpenObserveTransportOptions) {
    this.endpoint = options.endpoint;
    this.token = options.token;
    this.batchSize = options.batchSize ?? 100;
    this.flushInterval = options.flushInterval ?? 5000;
    this.service = options.service ?? 'service';
    this.timeout = options.timeout ?? 30000;
    this.staticLabels = options.staticLabels;

    if (this.flushInterval > 0) {
      this.timer = setInterval(() => {
        // Fire and forget; errors are logged to console
        this.flush().catch(() => void 0);
      }, this.flushInterval);
    }
  }

  log(entry: LogEntry, callback?: () => void): void {
    const enriched: LogEntry = {
      timestamp: entry.timestamp ?? new Date().toISOString(),
      service: this.service,
      ...this.staticLabels,
      ...entry,
    };

    this.queue.push(enriched);
    if (this.queue.length >= this.batchSize) {
      // Best-effort flush
      this.flush().catch(() => void 0);
    }

    if (callback) callback();
  }

  async flush(): Promise<void> {
    if (!this.endpoint || !this.token) {
      // Not configured; no-op
      this.queue = [];
      return;
    }

    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.queue.length);
    try {
      await axios.post(this.endpoint, batch, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        timeout: this.timeout,
      });
    } catch (error: any) {
      // Drop on failure to avoid blocking; log basic error
      const msg = error?.message || 'OpenObserveTransport flush failed';
      // eslint-disable-next-line no-console
      console.warn('[OpenObserveTransport] flush error:', msg);
    }
  }

  close(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}