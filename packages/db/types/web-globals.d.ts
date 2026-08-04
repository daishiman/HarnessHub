// Web 標準型の最小宣言。lib "DOM" を入れると document 等の偽グローバルが型面に混入するため、
// Workers/Node の双方に実在する型だけを @types/node の実型から導出して宣言する。

type CryptoKey = Awaited<ReturnType<typeof crypto.subtle.importKey>>;
type BufferSource = ArrayBufferView | ArrayBuffer;
type BlobPart = string | ArrayBufferView | ArrayBuffer | Blob;
