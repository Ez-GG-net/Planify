import { ActionID, IDv1, toolCallID } from "./id";

function generateUUIDv7() {
  const fromBytes = (buf: Uint8Array) => {
    return (
      buf[0].toString(16).padStart(2, '0') + buf[1].toString(16).padStart(2, '0') +
      buf[2].toString(16).padStart(2, '0') + buf[3].toString(16).padStart(2, '0') + '-' +
      buf[4].toString(16).padStart(2, '0') + buf[5].toString(16).padStart(2, '0') + '-' +
      ((buf[6] & 0x0f) | 0x70).toString(16).padStart(2, '0') + buf[7].toString(16).padStart(2, '0') + '-' +
      ((buf[8] & 0x3f) | 0x80).toString(16).padStart(2, '0') + buf[9].toString(16).padStart(2, '0') + '-' +
      buf[10].toString(16).padStart(2, '0') + buf[11].toString(16).padStart(2, '0') +
      buf[12].toString(16).padStart(2, '0') + buf[13].toString(16).padStart(2, '0') +
      buf[14].toString(16).padStart(2, '0') + buf[15].toString(16).padStart(2, '0')
    );
  };

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set timestamp (48-bit)
  const ts = Date.now();
  const tsHi = Math.floor(ts / 0x100000000);
  const tsLo = ts % 0x100000000;

  bytes[0] = (tsHi >> 8) & 0xff;
  bytes[1] = tsHi & 0xff;
  bytes[2] = (tsLo >> 24) & 0xff;
  bytes[3] = (tsLo >> 16) & 0xff;
  bytes[4] = (tsLo >> 8) & 0xff;
  bytes[5] = tsLo & 0xff;

  return fromBytes(bytes);
}
//has a very slight bias because 256/62 does not divide good (modulo)
function generaterandomAlphanumericString(length: number) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; //62 chars
  const buffer = new Uint8Array(length);

  // Fill the entire array with random bytes at once
  crypto.getRandomValues(buffer);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(buffer[i] % chars.length);
  }

  return result;
}



export function generateRandomIDv1() {
    //WARNING: collision possible with this method, but it's unlikely to happen in practice (1/2^74 chance) and includes a millisecond timestamp
    const randomId: IDv1 = generateUUIDv7();
    return randomId;
}
export function generateRandomToolCallID() {
  const randomId: toolCallID = generaterandomAlphanumericString(6)
  return randomId
}
export function generateRandomActionID() {
  const randomId: ActionID = generaterandomAlphanumericString(6)
  return randomId
}
