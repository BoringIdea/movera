import { Account, Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { ClayErasureCodingProvider, generateCommitments, ShelbyNodeClient } from "@shelby-protocol/sdk/node";
import { blake2b } from "@noble/hashes/blake2b";

export interface ShelbyUploadOptions {
  account: Account;
  blobName: string;
  blobData: Uint8Array;
  expirationMicros?: number;
  apiKey?: string;
  network?: Network;
  aptosClient?: Aptos;
  shelbyClient?: ShelbyNodeClient;
}

export interface ShelbyUploadResult {
  account: string;
  blobName: string;
  dataHash: Uint8Array;
  blobMerkleRoot: string;
  commitments: any;
  registerTxHash: string;
}

// Re-export generateBlobName from blob-utils for backward compatibility
export { generateBlobName } from './blob-utils.js';

export interface ShelbyDownloadOptions {
  account: string;
  blobName: string;
  apiKey?: string;
  network?: Network;
  shelbyClient?: ShelbyNodeClient;
}

export function computeBlake2b256(data: Uint8Array): Uint8Array {
  // Use BLAKE2b-256 (dkLen = 32) to match Move's blake2b_256
  return blake2b(data, { dkLen: 32 });
}

export function verifyBlake2b256(data: Uint8Array, expected: Uint8Array | string): boolean {
  const computed = computeBlake2b256(data);
  const expectedBytes = typeof expected === "string"
    ? Buffer.from(expected.replace(/^0x/, ""), "hex")
    : Buffer.from(expected);
  return Buffer.compare(Buffer.from(computed), expectedBytes) === 0;
}

export async function uploadToShelby(options: ShelbyUploadOptions): Promise<ShelbyUploadResult> {
  const {
    account,
    blobName,
    blobData,
    apiKey,
    network = Network.SHELBYNET,
    expirationMicros,
    aptosClient,
    shelbyClient,
  } = options;

  const shelbyNetwork = (network ?? Network.SHELBYNET) as any;
  const client = shelbyClient ?? new ShelbyNodeClient({ network: shelbyNetwork, apiKey });
  const aptos = aptosClient ?? new Aptos(new AptosConfig({ network: shelbyNetwork }));

  const provider = await ClayErasureCodingProvider.create();
  const commitments = await generateCommitments(provider, Buffer.from(blobData));

  const expiresAt = expirationMicros ?? (Date.now() + 1000 * 60 * 60 * 24 * 30) * 1000;

  const { transaction } = await client.coordination.registerBlob({
    account,
    blobName,
    blobMerkleRoot: commitments.blob_merkle_root,
    size: blobData.length,
    expirationMicros: expiresAt,
  });

  await aptos.waitForTransaction({ transactionHash: transaction.hash });

  await client.rpc.putBlob({
    account: account.accountAddress,
    blobName,
    blobData: new Uint8Array(blobData),
  });

  return {
    account: account.accountAddress.toString(),
    blobName,
    dataHash: computeBlake2b256(blobData),
    blobMerkleRoot: commitments.blob_merkle_root,
    commitments,
    registerTxHash: transaction.hash,
  };
}

export async function downloadFromShelby(options: ShelbyDownloadOptions): Promise<Uint8Array> {
  const {
    account,
    blobName,
    apiKey,
    network = Network.SHELBYNET,
    shelbyClient,
  } = options;

  const shelbyNetwork = (network ?? Network.SHELBYNET) as any;
  const client = shelbyClient ?? new ShelbyNodeClient({ network: shelbyNetwork, apiKey });
  const blob: any = await client.download({ account, blobName });

  if (!blob) {
    throw new Error('Empty Shelby download response');
  }

  if (blob instanceof Uint8Array) {
    return blob;
  }

  if (Buffer.isBuffer(blob)) {
    return new Uint8Array(blob);
  }

  const stream = blob?.stream ?? blob?.body ?? blob?.readable;
  if (stream?.[Symbol.asyncIterator]) {
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return new Uint8Array(Buffer.concat(chunks));
  }

  if (stream && typeof stream.on === 'function') {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve());
      stream.on('error', (err: Error) => reject(err));
    });
    return new Uint8Array(Buffer.concat(chunks));
  }

  if (typeof blob?.arrayBuffer === 'function') {
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  }

  if (blob?.data) {
    const data = blob.data;
    if (data instanceof Uint8Array) {
      return data;
    }
    if (Buffer.isBuffer(data)) {
      return new Uint8Array(data);
    }
    if (data?.buffer) {
      return new Uint8Array(data.buffer);
    }
  }

  throw new Error('Unsupported Shelby download response shape');
}
