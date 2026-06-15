/**
 * @fileoverview Unit tests for the GitHub App JWT signer and token cache.
 * Uses a generated RSA keypair so we don't depend on real GitHub credentials.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { _internals, signAppJwt, importPrivateKey } from '../src/github.js';

const { base64url, pemToBuffer } = _internals;

let privateKeyPem;
let publicKey;

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  publicKey = pair.publicKey;
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
  const lines = b64.match(/.{1,64}/g) || [b64];
  privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`;
});

describe('base64url', () => {
  it('replaces +, /, and padding with url-safe characters', () => {
    const out = base64url(new Uint8Array([255, 254, 253, 252]));
    expect(out).not.toMatch(/[+/=]/);
  });

  it('round-trips through atob', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5]);
    const encoded = base64url(original);
    const decoded = Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });
});

describe('pemToBuffer', () => {
  it('strips headers, footers, and whitespace', () => {
    const pem = `-----BEGIN PRIVATE KEY-----\nQUJD\n-----END PRIVATE KEY-----\n`;
    const buf = pemToBuffer(pem);
    expect(buf.byteLength).toBe(3);
    expect(new Uint8Array(buf)).toEqual(new Uint8Array([65, 66, 67]));
  });

  it('handles PKCS#1 (RSA PRIVATE KEY) markers', () => {
    const pem = `-----BEGIN RSA PRIVATE KEY-----\nQUJD\n-----END RSA PRIVATE KEY-----`;
    const buf = pemToBuffer(pem);
    expect(buf.byteLength).toBe(3);
  });
});

describe('signAppJwt', () => {
  it('produces a 3-segment JWT with valid header and payload', async () => {
    const key = await importPrivateKey(privateKeyPem);
    const jwt = await signAppJwt('12345', key, Date.UTC(2026, 0, 1));
    const [headerB64, payloadB64, sigB64] = jwt.split('.');
    expect(headerB64).toBeTruthy();
    expect(payloadB64).toBeTruthy();
    expect(sigB64).toBeTruthy();
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    expect(header).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(payload.iss).toBe('12345');
    expect(payload.exp - payload.iat).toBe(600); // 10 minutes
    expect(payload.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
  });

  it('emits a signature verifiable by the matching public key', async () => {
    const key = await importPrivateKey(privateKeyPem);
    const jwt = await signAppJwt('12345', key);
    const [h, p, s] = jwt.split('.');
    const data = new TextEncoder().encode(`${h}.${p}`);
    const sig = Uint8Array.from(
      atob(s.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );
    const ok = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      publicKey,
      sig,
      data,
    );
    expect(ok).toBe(true);
  });
});
