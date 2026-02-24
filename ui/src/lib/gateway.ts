import type { GatewayHelloOk, GatewayEventFrame, GatewayResponseFrame } from '@/types';

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (err: unknown) => void;
};

export type GatewayClientOptions = {
  url: string;
  token?: string;
  onHello?: (hello: GatewayHelloOk) => void;
  onEvent?: (evt: GatewayEventFrame) => void;
  onClose?: (info: { code: number; reason: string }) => void;
  onError?: (error: Error) => void;
};

const CONNECT_FAILED_CLOSE_CODE = 4008;

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingRequest>();
  private closed = false;
  private _connectNonce: string | null = null;
  private connectSent = false;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 800;

  constructor(private opts: GatewayClientOptions) {}

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  start(): void {
    this.closed = false;
    this.connect();
  }

  stop(): void {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
    this.flushPending(new Error('gateway client stopped'));
  }

  private connect(): void {
    if (this.closed) return;
    
    try {
      this.ws = new WebSocket(this.opts.url);
      this.ws.addEventListener('open', () => this.queueConnect());
      this.ws.addEventListener('message', (ev) => this.handleMessage(String(ev.data ?? '')));
      this.ws.addEventListener('close', (ev) => {
        const reason = String(ev.reason ?? '');
        this.ws = null;
        this.flushPending(new Error(`gateway closed (${ev.code}): ${reason}`));
        this.opts.onClose?.({ code: ev.code, reason });
        this.scheduleReconnect();
      });
      this.ws.addEventListener('error', () => {
        this.opts.onError?.(new Error('WebSocket error'));
      });
    } catch (err) {
      this.opts.onError?.(err instanceof Error ? err : new Error(String(err)));
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 1.7, 15000);
    setTimeout(() => this.connect(), delay);
  }

  private flushPending(err: Error): void {
    for (const [, p] of this.pending) {
      p.reject(err);
    }
    this.pending.clear();
  }

  private async sendConnect(): Promise<void> {
    if (this.connectSent) return;
    this.connectSent = true;
    if (this.connectTimer !== null) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }

    const role = 'operator';
    const scopes = ['operator.admin', 'operator.approvals', 'operator.pairing'];

    const params = {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: 'openclaw-control-ui',
        version: '1.0.0',
        platform: 'web',
        mode: 'ui',
      },
      role,
      scopes,
      caps: [],
      auth: this.opts.token ? { token: this.opts.token } : undefined,
      userAgent: navigator.userAgent,
      locale: navigator.language,
    };

    try {
      const hello = await this.request<GatewayHelloOk>('connect', params);
      this.backoffMs = 800;
      this.opts.onHello?.(hello);
    } catch {
      this.ws?.close(CONNECT_FAILED_CLOSE_CODE, 'connect failed');
    }
  }

  private handleMessage(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    const frame = parsed as { type?: unknown };
    
    if (frame.type === 'event') {
      const evt = parsed as GatewayEventFrame;
      if (evt.event === 'connect.challenge') {
        const payload = evt.payload as { nonce?: unknown } | undefined;
        const nonce = payload && typeof payload.nonce === 'string' ? payload.nonce : null;
        if (nonce) {
          this._connectNonce = nonce;
          void this.sendConnect();
        }
        return;
      }
      try {
        this.opts.onEvent?.(evt);
      } catch (err) {
        console.error('[gateway] event handler error:', err);
      }
      return;
    }

    if (frame.type === 'res') {
      const res = parsed as GatewayResponseFrame;
      const pending = this.pending.get(res.id);
      if (!pending) return;
      this.pending.delete(res.id);
      if (res.ok) {
        pending.resolve(res.payload);
      } else {
        pending.reject(new Error(res.error?.message ?? 'request failed'));
      }
    }
  }

  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('gateway not connected'));
        return;
      }
      const id = generateUUID();
      const frame = { type: 'req', id, method, params };
      this.pending.set(id, { resolve: (v) => resolve(v as T), reject });
      this.ws.send(JSON.stringify(frame));
    });
  }

  private queueConnect(): void {
    this._connectNonce = null;
    this.connectSent = false;
    if (this.connectTimer !== null) {
      clearTimeout(this.connectTimer);
    }
    this.connectTimer = setTimeout(() => {
      void this.sendConnect();
    }, 750);
  }
}

export function createGatewayClient(opts: GatewayClientOptions): GatewayClient {
  return new GatewayClient(opts);
}
