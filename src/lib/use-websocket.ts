import { useEffect, useRef, useState, useCallback, useMemo, MutableRefObject } from 'react';
import { DEFAULT_OPTIONS, ReadyState, UNPARSABLE_JSON_OBJECT } from './constants';
import { createOrJoinSocket } from './create-or-join';
import { getUrl } from './get-url';
import websocketWrapper from './proxy';
import type {
  Options,
  ReadyStateState,
  SendMessage,
  SendJsonMessage,
  WebSocketMessage,
  WebSocketHook,
  WebSocketEventMap,
} from './types';

export const useWebSocket = (
  url: string | (() => string | Promise<string>) | null,
  options: Options = DEFAULT_OPTIONS,
  connect: boolean = true,
): WebSocketHook => {
  const [lastMessage, setLastMessage] = useState<WebSocketEventMap['message']>({});
  const [readyState, setReadyState] = useState<ReadyStateState>({});
  const lastJsonMessage = useMemo(() => {
    if (lastMessage) {
      try {
        return JSON.parse(lastMessage.data);
      } catch (e) {
        return UNPARSABLE_JSON_OBJECT;
      }
    }
    return null;
  }, [lastMessage]);
  const convertedUrl = useRef<string>("");
  const webSocketRef = useRef<WebSocket | null>(null);
  const startRef = useRef<() => void>(() => { });
  const reconnectCount = useRef<number>(0);
  const messageQueue = useRef<WebSocketMessage[]>([]);
  const webSocketProxy = useRef<WebSocket | null>(null)
  const optionsCache = useRef<Options>(options);

  const readyStateFromUrl: ReadyState =
    convertedUrl.current && readyState[convertedUrl.current] !== undefined ?
      readyState[convertedUrl.current] :
      url !== null && connect === true ?
        ReadyState.CONNECTING :
        ReadyState.UNINSTANTIATED;

  const stringifiedQueryParams = options.queryParams ? JSON.stringify(options.queryParams) : null;

  const sendMessage: SendMessage = useCallback(message => {
    if (webSocketRef.current && webSocketRef.current.readyState === ReadyState.OPEN) {
      webSocketRef.current.send(message);
    } else {
      messageQueue.current.push(message);
    }
  }, []);

  const sendJsonMessage: SendJsonMessage = useCallback(message => {
    sendMessage(JSON.stringify(message));
  }, [sendMessage]);

  const getWebSocket = useCallback((): WebSocket => {
    if (optionsCache.current?.share !== true && null !== webSocketRef.current) {
      return webSocketRef.current;
    }

    if (webSocketProxy.current === null && webSocketRef.current && startRef.current) {
      webSocketProxy.current = websocketWrapper(webSocketRef.current, startRef);
    } else {
      return webSocketProxy.current as WebSocket;
    }

    return webSocketProxy.current;
  }, [optionsCache]);

  useEffect(() => {
    if (url !== null && connect === true) {
      let removeListeners: () => void;
      let expectClose = false;

      const start = async () => {
        convertedUrl.current = await getUrl(url, optionsCache);

        const protectedSetLastMessage = (message: WebSocketEventMap['message']) => {
          if (!expectClose) {
            setLastMessage(message);
          }
        };

        const protectedSetReadyState = (state: ReadyState) => {
          if (!expectClose) {
            setReadyState(prev => ({
              ...prev,
              [convertedUrl.current]: state,
            }));
          }
        };
        removeListeners = createOrJoinSocket(
          webSocketRef as MutableRefObject<WebSocket>,
          convertedUrl.current,
          protectedSetReadyState,
          optionsCache,
          protectedSetLastMessage,
          startRef,
          reconnectCount,
        );
      };

      startRef.current = () => {
        if (!expectClose) {
          if (webSocketProxy.current) webSocketProxy.current = null;
          removeListeners?.();
          start();
        }
      };

      start();
      return () => {
        expectClose = true;
        if (webSocketProxy.current) webSocketProxy.current = null;
        removeListeners?.();
        setLastMessage({});
      };
    }else{
      return;
    }
  }, [url, connect, stringifiedQueryParams, optionsCache, sendMessage]);

  useEffect(() => {
    if (readyStateFromUrl === ReadyState.OPEN) {
      messageQueue.current.splice(0).forEach(message => {
        sendMessage(message);
      });
    }
  }, [readyStateFromUrl]);

  return {
    sendMessage,
    sendJsonMessage,
    lastMessage,
    lastJsonMessage,
    readyState: readyStateFromUrl,
    getWebSocket,
  };
};
