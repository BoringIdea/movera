import {
  SuiClient,
  SuiTransactionBlockResponse
} from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Network, getClient } from '../utils';

export class Blacklist {
  private client: SuiClient;
  private signer: Ed25519Keypair;
  private chain: string;
  private network: Network;

  constructor(chain: string, network: Network, signer: Ed25519Keypair) {
    this.chain = chain;
    this.network = network;
    this.client = getClient(chain, network);
    this.signer = signer;
  }

  async add(schemaId: string, resolver_builder: any): Promise<SuiTransactionBlockResponse> {
    const tx = new Transaction();
    tx.moveCall({
      target: `${this.chain}::blacklist::add`,
      arguments: [
        tx.object(schemaId),
        resolver_builder,
      ],
    });

    const result = await this.client.signAndExecuteTransaction({
      signer: this.signer,
      transaction: tx,
    });
    return await this.client.waitForTransaction({
      digest: result.digest,
      options: {
        showEffects: true,
      },
    });
  }
}
