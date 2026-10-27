/**
 * authCrypto.ts
 *
 * Client-side cryptographic helper supporting standard scrypt verification & hashing.
 * 100% interoperable with Node.js crypto.scryptSync(password, salt, 64).
 */

function rotr(a: number, b: number): number {
  return (a << b) | (a >>> (32 - b));
}

function salsa20_8(B: Int32Array): void {
  const x = new Int32Array(16);
  for (let i = 0; i < 16; i++) x[i] = B[i];
  for (let i = 0; i < 8; i += 2) {
    x[ 4] ^= rotr(x[ 0] + x[12],  7);  x[ 8] ^= rotr(x[ 4] + x[ 0],  9);
    x[12] ^= rotr(x[ 8] + x[ 4], 13);  x[ 0] ^= rotr(x[12] + x[ 8], 18);
    x[ 9] ^= rotr(x[ 5] + x[ 1],  7);  x[13] ^= rotr(x[ 9] + x[ 5],  9);
    x[ 1] ^= rotr(x[13] + x[ 9], 13);  x[ 5] ^= rotr(x[ 1] + x[13], 18);
    x[14] ^= rotr(x[10] + x[ 6],  7);  x[ 2] ^= rotr(x[14] + x[10],  9);
    x[ 6] ^= rotr(x[ 2] + x[14], 13);  x[10] ^= rotr(x[ 6] + x[ 2], 18);
    x[ 3] ^= rotr(x[15] + x[11],  7);  x[ 7] ^= rotr(x[ 3] + x[15],  9);
    x[11] ^= rotr(x[ 7] + x[ 3], 13);  x[15] ^= rotr(x[11] + x[ 7], 18);
    x[ 1] ^= rotr(x[ 0] + x[ 3],  7);  x[ 2] ^= rotr(x[ 1] + x[ 0],  9);
    x[ 3] ^= rotr(x[ 2] + x[ 1], 13);  x[ 0] ^= rotr(x[ 3] + x[ 2], 18);
    x[ 6] ^= rotr(x[ 5] + x[ 4],  7);  x[ 7] ^= rotr(x[ 6] + x[ 5],  9);
    x[ 4] ^= rotr(x[ 7] + x[ 6], 13);  x[ 5] ^= rotr(x[ 4] + x[ 7], 18);
    x[11] ^= rotr(x[10] + x[ 9],  7);  x[ 8] ^= rotr(x[11] + x[10],  9);
    x[ 9] ^= rotr(x[ 8] + x[11], 13);  x[10] ^= rotr(x[ 9] + x[ 8], 18);
    x[12] ^= rotr(x[15] + x[14],  7);  x[13] ^= rotr(x[12] + x[15],  9);
    x[14] ^= rotr(x[13] + x[12], 13);  x[15] ^= rotr(x[14] + x[13], 18);
  }
  for (let i = 0; i < 16; i++) B[i] = (B[i] + x[i]) | 0;
}

function blockmix_salsa8(B: Int32Array, Y: Int32Array, r: number): void {
  const X = new Int32Array(16);
  for (let i = 0; i < 16; i++) X[i] = B[(2 * r - 1) * 16 + i];
  for (let i = 0; i < 2 * r; i++) {
    for (let j = 0; j < 16; j++) X[j] ^= B[i * 16 + j];
    salsa20_8(X);
    const dest = (i % 2 === 0 ? (i / 2) : (r + (i - 1) / 2)) * 16;
    for (let j = 0; j < 16; j++) Y[dest + j] = X[j];
  }
}

function smix(B: Uint8Array, r: number, N: number): void {
  const B32 = new Int32Array(B.buffer, B.byteOffset, B.byteLength / 4);
  const Y = new Int32Array(32 * r);
  const V = new Int32Array(N * 32 * r);
  const len32 = 32 * r;

  for (let i = 0; i < N; i++) {
    V.set(B32, i * len32);
    blockmix_salsa8(B32, Y, r);
    B32.set(Y);
  }

  for (let i = 0; i < N; i++) {
    const j = (B32[(2 * r - 1) * 16] & (N - 1)) * len32;
    for (let k = 0; k < len32; k++) B32[k] ^= V[j + k];
    blockmix_salsa8(B32, Y, r);
    B32.set(Y);
  }
}

async function pbkdf2Subtle(
  password: string,
  salt: string | Uint8Array,
  iterations: number,
  keyLen: number
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const subtle = typeof window !== 'undefined' && window.crypto?.subtle ? window.crypto.subtle : (globalThis as any).crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Cryptography API (crypto.subtle) is not available.');
  }

  const passKey = await subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: typeof salt === 'string' ? enc.encode(salt) : salt,
      iterations,
      hash: 'SHA-256',
    },
    passKey,
    keyLen * 8
  );

  return new Uint8Array(derivedBits);
}

export function getDefaultPasswordForRole(role?: string): string {
  switch (role) {
    case 'admin':
      return 'sikri_parth@2';
    case 'pr_head':
      return 'head123';
    case 'pr_intern':
      return 'intern123';
    case 'sales':
      return 'sales123';
    case 'web_developer':
    case 'web_dev_manager':
      return 'dev123';
    default:
      return 'teach123';
  }
}

export async function hashPasswordClient(password: string): Promise<string> {
  const saltBytes = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(saltBytes);
  } else if ((globalThis as any).crypto) {
    (globalThis as any).crypto.getRandomValues(saltBytes);
  } else {
    for (let i = 0; i < 16; i++) saltBytes[i] = Math.floor(Math.random() * 256);
  }

  let salt = '';
  for (let i = 0; i < 16; i++) {
    salt += saltBytes[i].toString(16).padStart(2, '0');
  }

  const N = 16384;
  const r = 8;
  const p = 1;
  const dkLen = 64;

  const B = await pbkdf2Subtle(password, salt, 1, p * 128 * r);
  for (let i = 0; i < p; i++) {
    const slice = new Uint8Array(B.buffer, B.byteOffset + i * 128 * r, 128 * r);
    smix(slice, r, N);
  }
  const derived = await pbkdf2Subtle(password, B, 1, dkLen);

  let hashHex = '';
  for (let i = 0; i < derived.length; i++) {
    hashHex += derived[i].toString(16).padStart(2, '0');
  }

  return `scrypt:${salt}:${hashHex}`;
}

export async function verifyPasswordClient(
  password: string,
  storedPassword?: string | null,
  role?: string,
  lastPasswordChangedAt?: string
): Promise<boolean> {
  const cleanInput = (password || '').trim();
  if (!cleanInput) return false;

  const targetStored = (storedPassword || '').trim();

  if (targetStored.startsWith('scrypt:')) {
    const parts = targetStored.split(':');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const expectedHashHex = parts[2];

    try {
      const N = 16384;
      const r = 8;
      const p = 1;
      const dkLen = 64;

      const B = await pbkdf2Subtle(cleanInput, salt, 1, p * 128 * r);
      for (let i = 0; i < p; i++) {
        const slice = new Uint8Array(B.buffer, B.byteOffset + i * 128 * r, 128 * r);
        smix(slice, r, N);
      }
      const derived = await pbkdf2Subtle(cleanInput, B, 1, dkLen);

      let hex = '';
      for (let i = 0; i < derived.length; i++) {
        hex += derived[i].toString(16).padStart(2, '0');
      }

      if (hex.toLowerCase() === expectedHashHex.toLowerCase()) {
        return true;
      }
    } catch (err) {
      console.warn('[authCrypto] scrypt verification error:', err);
      return false;
    }

    // Custom password scrypt check failed. Do NOT allow fallback to old default passwords if user has changed password!
    if (lastPasswordChangedAt) {
      return false;
    }

    // Only allow initial default passwords if user has NEVER changed their password
    if (role === 'admin' && !lastPasswordChangedAt && (cleanInput === 'sikri_parth@2' || cleanInput === 'admin123')) {
      return true;
    }
    return false;
  }

  // Legacy plaintext match
  if (targetStored && cleanInput === targetStored) {
    return true;
  }

  // Default role password fallback if stored was empty
  const defaultPass = getDefaultPasswordForRole(role);
  if (!targetStored && cleanInput === defaultPass) {
    return true;
  }

  // Initial admin default fallback
  if (role === 'admin' && !lastPasswordChangedAt && (cleanInput === 'sikri_parth@2' || cleanInput === 'admin123')) {
    return true;
  }

  return false;
}
