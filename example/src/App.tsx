import * as React from 'react';
import useWebSocket, { ReadyState } from '../../src';
import { Button, Text, FlatList } from 'react-native';

export default function App() {
  const [socketUrl] = React.useState('wss://echo.websocket.org');
  const messageHistory = React.useRef<any>([]);

  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);

  messageHistory.current = React.useMemo(
    () => messageHistory.current.concat(lastMessage),
    [lastMessage]
  );

  const sendM = () => sendMessage('Hello');
  const handleClickSendMessage = React.useCallback(sendM, [sendM]);

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
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
          return item.toString() + i.toString();
        }}
        data={messageHistory.current}
        renderItem={({ item }) =>
          item && item.message && <Text>{item.message.data}</Text>
        }
      />
    </>
  );
}
