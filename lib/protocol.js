import { Buffer } from 'node:buffer';

export const HEADER_SIZE = 16;

export function buildBinaryHeader(transferId) {
  const hex = transferId.replace(/-/g, '');
  if (hex.length !== 32) throw new Error('transferId must be a UUID');
  return Buffer.from(hex, 'hex');
}

export function parseBinaryHeader(frame) {
  const buf = Buffer.isBuffer(frame) ? frame : Buffer.from(frame);
  if (buf.length < HEADER_SIZE) throw new Error('binary frame too short');
  const hex = buf.subarray(0, HEADER_SIZE).toString('hex');
  const transferId =
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  return { transferId, payload: buf.subarray(HEADER_SIZE) };
}
