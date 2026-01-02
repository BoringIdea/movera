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
  data: any;
  txHash?: string;
}