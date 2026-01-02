import { Account, Aptos, AptosConfig, Network, CommittedTransactionResponse, Hex } from "@aptos-labs/ts-sdk";
import { createSurfClient } from '@thalalabs/surf';
import { getPackageAddress } from './utils';
import { AptosSchema, AptosAttestation } from './types';

export class Aas {
  private account: Account;
  private aptosClient: Aptos;
  private surfClient: any;
  private network: Network;
  private chain: string;
  private packageId: string;
  private fullNode?: string;

  constructor(account: Account, chain: string, network: Network, fullNode?: string) {
    this.network = network;
    this.chain = chain;
    this.aptosClient = fullNode ? new Aptos(new AptosConfig({ network, fullnode: fullNode })) : new Aptos(new AptosConfig({ network }));
    this.account = account;
    this.surfClient = createSurfClient(this.aptosClient);
    this.packageId = getPackageAddress(chain, this.network as any);
    this.fullNode = fullNode;
  }

  async createSchema(
    schema: Uint8Array,
    name: string,
    description: string,
    url: string,
    revokable: boolean,
    resolver = "0x0"
  ): Promise<CommittedTransactionResponse> {
    const transaction = await this.aptosClient.transaction.build.simple({
      sender: this.account.accountAddress,
      data: {
        function: `${this.packageId}::aas::create_schema`,
        functionArguments: [
          schema, 
          name, 
          description, 
          url, 
          revokable, 
          resolver
        ]
      }
    });

    const tx = await this.aptosClient.transaction.signAndSubmitTransaction({
      signer: this.account,
      transaction
    });

    return await this.aptosClient.waitForTransaction({ transactionHash: tx.hash });
  }

  async createAttestation(
    recipient: string,
    schemaAddr: string,
    refAttestation: string,
    expirationTime: number,
    revokable: boolean,
    data: Uint8Array
  ): Promise<CommittedTransactionResponse> {
    const transaction = await this.aptosClient.transaction.build.simple({
      sender: this.account.accountAddress,
      data: {
        function: `${this.packageId}::aas::create_attestation`,
        functionArguments: [recipient, schemaAddr, refAttestation, expirationTime, revokable, data]
      }
    });

    const tx = await this.aptosClient.transaction.signAndSubmitTransaction({
      signer: this.account,
      transaction
    });

    return await this.aptosClient.waitForTransaction({ transactionHash: tx.hash });
  }

  async revokeAttestation(
    schemaAddr: string,
    attestationAddr: string
  ): Promise<CommittedTransactionResponse> {
    const transaction = await this.aptosClient.transaction.build.simple({
      sender: this.account.accountAddress,
      data: {
        function: `${this.packageId}::aas::revoke_attestation`,
        functionArguments: [schemaAddr, attestationAddr]
      }
    });

    const tx = await this.aptosClient.transaction.signAndSubmitTransaction({
      signer: this.account,
      transaction
    });

    return await this.aptosClient.waitForTransaction({ transactionHash: tx.hash });
  }

  async getSchema(schemaAddr: string): Promise<AptosSchema> {
    return getAptosSchema(this.chain, this.network, schemaAddr, this.fullNode);
  }

  async getAttestation(attestationAddr: string): Promise<AptosAttestation> {
    return getAptosAttestation(this.chain, this.network, attestationAddr, this.fullNode);
  }
}

export async function getAptosSchema(chain: string, network: Network, schemaAddr: string, fullNode?: string): Promise<AptosSchema> {
    const aptosClient = fullNode ? new Aptos(new AptosConfig({ network, fullnode: fullNode })) : new Aptos(new AptosConfig({ network }));
    const packageId = getPackageAddress(chain, network as any);
    const schemas = await aptosClient.view(
      {
        payload: {
          function: `${packageId}::schema::schema_data`,
          functionArguments: [schemaAddr]
        }
      }
    )

    if (!schemas) {
      throw new Error("Schema not found");
    }

    const schema = schemas[0] as any;

    return {
      schemaAddr: schemaAddr,
      name: schema.name,
      description: schema.description,
      url: schema.url,
      creator: schema.creator,
      createdAt: schema.created_at,
      schema: Hex.fromHexString(schema.schema).toUint8Array(),
      revokable: schema.revokable,
      resolver: schema.resolver,
      txHash: schema.tx_hash
    }
}

export async function getAptosAttestation(chain: string, network: Network, attestationAddr: string, fullNode?: string): Promise<AptosAttestation> {
    const aptosClient = fullNode ? new Aptos(new AptosConfig({ network, fullnode: fullNode })) : new Aptos(new AptosConfig({ network }));
    const packageId = getPackageAddress(chain, network as any);
    const res = await aptosClient.view(
      {
        payload: {
          function: `${packageId}::attestation::attestation_data`,
          functionArguments: [attestationAddr]
        }
      }
    )

    if (!res) {
      throw new Error("Attestation not found");
    }

    const attestation = res[0] as any;

    return {
      attestationAddr: attestationAddr,
      attestor: attestation.attestor,
      recipient: attestation.recipient,
      schemaAddr: attestation.schema,
      refAttestation: attestation.ref_attestation,
      time: attestation.time,
      expirationTime: attestation.expiration_time,
      revocationTime: attestation.revocation_time,
      revokable: attestation.revokable,
      data: Hex.fromHexString(attestation.data).toUint8Array(),
      txHash: attestation.tx_hash
    }
}