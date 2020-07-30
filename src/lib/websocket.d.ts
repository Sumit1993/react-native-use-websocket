// code from typescript/lib/lib.dom.d.ts
// It is useful when using react-native with typescript. 
// Or you can add dom libarary as `lib: ["esnext" ,"dom"]` in tsconfig.json

interface WebSocketEventMap {
    "close": CloseEvent;
    "error": Event;
    "message": MessageEvent;
    "open": Event;
}