import type { MutableRefObject } from 'react';
import type { ReadyState } from './constants';

export interface QueryParams {
  [key: string]: string | number;
}

export interface Options {
  fromSocketIO?: boolean;
  queryParams?: QueryParams;
  protocols?: string | string[];
  options?: {
    [optionName: string]: any;
    headers: {
      [headerName: string]: string;
    };
  } | null;
  share?: boolean;
  onOpen?: () => void;
  onClose?: (event: WebSocketEventMap['close']) => void;
  onMessage?: (event: WebSocketEventMap['message']) => void;
  onError?: (event: WebSocketEventMap['error']) => void;
  onReconnectStop?: (numAttempts: number) => void;
  shouldReconnect?: (event: WebSocketEventMap['close']) => boolean;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  filter?: (message: WebSocketEventMap['message']) => boolean;
  retryOnError?: boolean;
}

export type ReadyStateState = {
  [url: string]: ReadyState;
};

export type WebSocketMessage =
  | string
  | ArrayBuffer
  | SharedArrayBuffer
  | Blob
  | ArrayBufferView;

export type SendMessage = (message: WebSocketMessage) => void;
export type SendJsonMessage = (jsonMessage: any) => void;

export type Subscriber<T = WebSocketEventMap['message']> = {
  setLastMessage: (message: T) => void;
  setReadyState: (readyState: ReadyState) => void;
  optionsRef: MutableRefObject<Options>;
  reconnectCount: MutableRefObject<number>;
  reconnect: MutableRefObject<() => void>;
};

export type WebSocketHook<T = WebSocketEventMap['message']> = {
  sendMessage: SendMessage;
  sendJsonMessage: SendJsonMessage;
  lastMessage: T;
  lastJsonMessage: any;
  readyState: ReadyState;
  getWebSocket: () => WebSocket;
};

// code from typescript/lib/lib.dom.d.ts
// It is useful when using react-native with typescript.
// Or you can add dom libarary as `lib: ["esnext" ,"dom"]` in tsconfig.json

export type WebSocketEventMap = {
  close: WebSocketCloseEvent;
  error: WebSocketErrorEvent;
  message: WebSocketMessageEvent;
};
