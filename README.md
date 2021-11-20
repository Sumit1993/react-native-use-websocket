# React Native useWebSocket

  

React Hook designed to provide robust WebSocket integrations to your React Native project.

**Credit** (fork from): [robtaussig/react-use-websocket](https://github.com/robtaussig/react-use-websocket)

  

## Example Implementation

  

```js
import * as React from "react";
import useWebSocket, { ReadyState } from "../../src";
import { Button, Text, FlatList } from "react-native";

export default function App() {

  const [socketUrl] = React.useState("wss://echo.websocket.org");

  const messageHistory = React.useRef < any > [];

  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);

  messageHistory.current = React.useMemo(
    () => messageHistory.current.concat(lastMessage),
    [lastMessage]
  );

  const sendM = () => sendMessage("Hello");

  const handleClickSendMessage = React.useCallback(sendM, [sendM]);

  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState];

  return (
    <>
      <Button
        onPress={handleClickSendMessage}
        disabled={readyState !== ReadyState.OPEN}
        title={"Click Me to send 'Hello'"}
      />
      <Text>The WebSocket is currently {connectionStatus}</Text>
      {lastMessage ? <Text>Last message: {lastMessage.data}</Text> : null}
      <FlatList
        keyExtractor={(item, i) => {
          return i.toString();
        }}
        data={messageHistory.current}
        renderItem={({ item }) =>
          item && item.message && <Text>{item.message.data}</Text>
        }
      />
    </>
  );
}

```

  

From the example above, the component will rerender every time the `readyState` of the WebSocket changes, as well as when the WebSocket receives a message (which will change `lastMessage`). `sendMessage` is a memoized callback that will pass the message to the current WebSocket (referenced to internally with `useRef`).

  

## Features

- Handles reconnect logic

- Multiple components can (optionally) use a single WebSocket, which is closed and cleaned up when all subscribed components have unsubscribed/unmounted

- Written in TypeScript

- Socket.io support

- No more waiting for the WebSocket to open before messages can be sent. Pre-connection messages are queued up and sent on connection

- Provides direct access to unshared WebSockets, while proxying shared WebSockets. Proxied WebSockets provide subscribers controlled access to the underlying (shared) WebSocket, without allowing unsafe behavior

  

## Getting Started

  

```sh
npm install react-native-use-websocket
```

  

```js
import useWebSocket from 'react-native-use-websocket';

// In functional React component
// This can also be an async getter function. See notes below on Async Urls.

const socketUrl = 'wss://echo.websocket.org';
const {
    sendMessage,
    sendJsonMessage,
    lastMessage,
    lastJsonMessage,
    readyState,
    getWebSocket
} = useWebSocket(socketUrl, {
    onOpen: () => console.log('opened'),
    //Will attempt to reconnect on all close events, such as server shutting down
    shouldReconnect: (closeEvent) => true,
});
```

  

## Requirements

- React 16.8+

- Cannot be used within a class component (must be a functional component that supports React Hooks)

  

## Async Urls

Instead of passing a string as the first argument to useWebSocket, you can pass a function that returns a string (or a promise that resolves to a string). It's important to note, however, that other rules still apply -- namely, that if the function reference changes, then it will be called again, potentially instantiating a new WebSocket if the returned url changes.

  

```js
import useWebSocket from 'react-use-websocket';

// In functional React component

const getSocketUrl = useCallback(() => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve('wss://echo.websocket.org');
        }, 2000);
    });
}, []);

const {
    sendMessage,
    lastMessage,
    readyState,
    getWebSocket
} = useWebSocket(getSocketUrl, STATIC_OPTIONS);
```

  

## API

  

### sendMessage

```ts
type  sendMessage = (message: string) =>  void;
```

The argument sent through sendMessage will be passed directly to WebSocket#`send`. `sendMessage` will be static, and thus can be passed down through children components without triggering prop changes. Messages sent before the WebSocket is open will be queued up and sent on connection.

  

### sendJsonMessage

```ts
type  sendJsonMessage = (message: any) =>  void;
```

Message will first be passed through `JSON.stringify`.

  

### lastMessage

```ts
type  lastMessage = WebSocketEventMap['message'];
```

Will be an unparsed `MessageEvent` received from the WebSocket.

  

### lastJsonMessage

```ts
type  lastMessage = any;
```

A `JSON.parse`d object from the `lastMessage`. If `lastMessage` is not a valid JSON string, `lastJsonMessage` will be an empty object.

  

### readyState

```ts
enum ReadyState {
	UNINSTANTIATED = -1,
	CONNECTING = 0,
	OPEN = 1,
	CLOSING = 2,
	CLOSED = 3
}
```

Will be an integer representing the `readyState` of the WebSocket. `-1` is not a valid WebSocket `readyState`, but instead indicates that the WebSocket has not been instantiated yet (either because the url is `null` or connect param is `false`)

  

### getWebSocket

```ts
type  getWebSocket = () =>  WebSocket | Proxy<WebSocket>
```

If the WebSocket is shared, calling this function will lazily instantiate a `Proxy` instance that wraps the underlying WebSocket. You can get and set properties on the return value that will directly interact with the WebSocket, however certain properties/methods are protected (cannot invoke `close` or `send`, and cannot redefine any of the event handlers like `onmessage`, `onclose`, `onopen` and `onerror`. An example of using this:

  

```js
const {
    sendMessage,
    lastMessage,
    readyState,
    getWebSocket
} = useWebSocket('wss://echo.websocket.org', {
    share: true
});

useEffect(() => {
  
    console.log(getWebSocket().binaryType) //=> 'blob'

    //Change binaryType property of WebSocket
    getWebSocket().binaryType = 'arraybuffer';
    console.log(getWebSocket().binaryType) //=> 'arraybuffer'

    //Attempt to change event handler
    getWebSocket().onmessage = console.log //=> A warning is logged to console: 'The WebSocket's event handlers should be defined through the options object passed into useWebSocket.'

    //Attempt to change an immutable property
    getWebSocket().url = 'www.google.com';
    console.log(getWebSocket().url); //=> 'wss://echo.websocket.org'

    //Attempt to call webSocket#send
    getWebSocket().send('Hello from WebSocket'); //=> No message is sent, and no error thrown (a no-op function was returned), but an error will be logged to console: 'Calling methods directly on the WebSocket is not supported at this moment. You must use the methods returned by useWebSocket.'

}, []);
```

If the WebSocket is not shared (via options), then the return value is the underlying WebSocket, and thus methods such as `close` and `send` can be accessed and used.

  

## Reconnecting

By default, `useWebSocket` will not attempt to reconnect to a WebSocket. This behavior can be modified through a few options. To attempt to reconnect on error events, set `Options#retryOnError` to `true`. Because `CloseEvent`s are less straight forward (e.g., was it triggered intentionally by the client or by something unexpected by the server restarting?), `Options#shouldReconnect` must be provided as a callback, with the socket `CloseEvent` as the first and only argument, and a return value of either `true` or `false`. If `true`, `useWebSocket` will attempt to reconnect up to a specified number of attempts (with a default of `20`) at a specified interval (with a default of `5000` (ms)). The option properties for attempts is `Options#reconnectAttempts` and the interval is `Options#reconnectInterval`. As an example:

  

```js
const didUnmount = useRef(false);

const [sendMessage, lastMessage, readyState] = useWebSocket(
    'wss://echo.websocket.org', {
        shouldReconnect: (closeEvent) => {
          
            /*
            useWebSocket will handle unmounting for you, but this is an example of a
            case in which you would not want it to automatically reconnect
            */
            return didUnmount.current === false;
        },
        reconnectAttempts: 10,
        reconnectInterval: 3000,
    });

useEffect(() => {
    return () => {
        didUnmount.current = true;
    };
}, []);
```

  

## Options

```ts
interface Options {
    share ? : boolean;
    shouldReconnect ? : (event: WebSocketEventMap['close']) => boolean;
    reconnectInterval ? : number;
    reconnectAttempts ? : number;
    filter ? : (message: WebSocketEventMap['message']) => boolean;
    retryOnError ? : boolean;
    onOpen ? : (event: WebSocketEventMap['open']) => void;
    onClose ? : (event: WebSocketEventMap['close']) => void;
    onMessage ? : (event: WebSocketEventMap['message']) => void;
    onError ? : (event: WebSocketEventMap['error']) => void;
    onReconnectStop?: (numAttempts: number) => void;
    fromSocketIO ? : boolean;
    queryParams ? : {
        [key: string]: string | number;
    };
    protocols ? : string | string[];
    options ? : {
        [optionName: string]: any;
        headers: {
            [headerName: string]: string;
        };
    } | null;
}
```

### shouldReconnect

See section on [Reconnecting](#Reconnecting).

  

### reconnectInterval

Number of milliseconds to wait until it attempts to reconnect. Default is 5000.

  

### Event Handlers: Callback

Each of `Options#onMessage`, `Options#onError`, `Options#onClose`, and `Options#onOpen` will be called on the corresponding WebSocket event, if provided. Each will be passed the same event provided from the WebSocket.

### onReconnectStop
If provided in options, will be called when websocket exceeds reconnect limit, either as provided in the options or the default value of 20.  

### share: Boolean

If set to `true`, a new WebSocket will not be instantiated if one for the same url has already been created for another component. Once all subscribing components have either unmounted or changed their target socket url, shared WebSockets will be closed and cleaned up. No other APIs should be affected by this.

  

### fromSocketIO: Boolean

SocketIO acts as a layer on top of the WebSocket protocol, and the required client-side implementation involves a few peculiarities. If you have a SocketIO back-end, or are converting a client-side application that uses the socketIO library, setting this to `true` might be enough to allow `useWebSocket` to work interchangeably. This is an experimental option as the SocketIO library might change its API at any time. This was tested with Socket IO `2.1.1`.

  

### queryParams: Object

Pass an object representing an arbitrary number of query parameters, which will be converted into stringified query params and appended to the WebSocket url.

  

```js
const queryParams = {
    'user_id': 1,
    'room_id': 5
};

//<url>?user_id=1&room_id=5
```

  

### useSocketIO

SocketIO sends messages in a format that isn't JSON-parsable. One example is:

```
"42["Action",{"key":"value"}]"
```

An extension of this hook is available by importing `useSocketIO`:

```js
import { useSocketIO } from 'react-use-websocket';

//Same API in component
const {
    sendMessage,
    lastMessage,
    readyState
} = useSocketIO('socket.io');
```

It is important to note that `lastMessage` will not be a `MessageEvent`, but instead an object with two keys: `type` and `payload`.

  

### Filter: Callback

If a function is provided with the key `filter`, incoming messages will be passed through the function, and only if it returns `true` will the hook pass along the `lastMessage` and update your component.