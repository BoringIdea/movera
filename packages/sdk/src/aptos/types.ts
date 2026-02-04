export interface AptosSchema {
  schemaAddr: string;
  name: string;
  description: string;
  url: string;
  creator: string;
  createdAt: number;
  schema: Uint8Array;
  revokable: boolean;
  resolver: string;
  txHash?: string;
}

export interface AptosAttestation {
  attestationAddr: string;
  schemaAddr: string;
  refAttestation: string;
  time: number;
  expirationTime: number;
  revocationTime: number;
  revokable: boolean;
  attestor: string;
  recipient: string;
  storageType?: number;
  data: any;
  dataHash?: Uint8Array;
  shelbyAccount?: string;
  shelbyBlobName?: string;
  shelbyBlobMerkleRoot?: Uint8Array;
  shelbyRegisterTxHash?: Uint8Array;
  txHash?: string;
}
