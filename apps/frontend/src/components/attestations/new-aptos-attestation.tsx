"use client"

import { useState, useEffect, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/header"
import Link from 'next/link'
import { getPackageAddress, Codec, SchemaField } from "@movera/sdk"
import { getExplorerTxUrl } from "@/utils"
import { AlertDialog, Flex } from "@radix-ui/themes"
import { Loader2 } from "lucide-react"
import { Chain } from "@/components/providers/chain-provider"
import { getNetwork } from "@/utils/utils"
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Hex } from '@aptos-labs/ts-sdk';
import { bcs } from "@mysten/bcs"
import { Buffer } from "buffer";
import { uploadAptosOffChainData } from "@/api/attestation";

const network = getNetwork() || 'testnet';
const config = new AptosConfig({ network: network as any });
const aptos = new Aptos(config);

export function NewAptosAttestation({ chain, schema }: { chain: Chain, schema: any }) {
  const { connected, account, signAndSubmitTransaction } = useWallet();
  const [digest, setDigest] = useState('');
  const [selectedButton, setSelectedButton] = useState("onchain")
  const [fieldValues, setFieldValues] = useState<{ [key: string]: string }>({})
  const [recipient, setRecipient] = useState("")
  const [expirationTime, setExpirationTime] = useState(0)
  const [refAttestationId, setRefAttestationId] = useState("0x00")
  const [isRevocable, setIsRevocable] = useState(false)
  const [isLoading, setIsLoading] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Use useMemo to avoid recreating these objects on every render
  const schemaRawString = useMemo(() => bcs.string().parse(Hex.fromHexString(schema.schema).toUint8Array()), [schema.schema]);
  const codec = useMemo(() => new Codec(schemaRawString), [schemaRawString]);
  const schemaItem = useMemo(() => codec.schemaItem(), [codec]);

  useEffect(() => {
    if (schema && schema.schema && schemaItem) {
      const initialValues = schemaItem.reduce((acc: any, field: SchemaField) => {
        acc[field.name] = ''
        return acc
      }, {})
      setFieldValues(initialValues)
    }
  }, [schema, schemaItem])

  const handleInputChange = (name: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [name]: value }))
  }

  const handleButtonClick = (button: any) => {
    setSelectedButton(button)
  }
  const handleRevocableChange = () => {
    setIsRevocable(!isRevocable)
  }

  const handleCreateAttestation = async () => {
    if (!connected) {
      alert("Please connect wallet first!")
      return;
    }

    setIsLoading(true);

    const attestationData: { [key: string]: string | number | number[] | bigint | bigint[] } = {};

    for (const [key, value] of Object.entries(fieldValues)) {
      const field = schemaItem.find(f => f.name === key);
      if (field) {
        if (field.type === 'u64') {
          attestationData[key] = BigInt(value);
        } else if (['u8', 'u16', 'u32'].includes(field.type)) {
          attestationData[key] = parseInt(value, 10);
        } else if (field.type.startsWith('Vector')) {
          try {
            const arrayValue = JSON.parse(value.replace(/\s/g, ''));
            if (Array.isArray(arrayValue)) {
              if (field.vectorType === 'u64') {
                attestationData[key] = arrayValue.map(BigInt);
              } else if (['u8', 'u16', 'u32'].includes(field.vectorType || "")) {
                attestationData[key] = arrayValue.map(v => parseInt(v, 10));
              } else {
                attestationData[key] = arrayValue.map(v => v);
              }
            } else {
              throw new Error('Invalide Array format');
            }
          } catch (error) {
            console.error(`Decode ${key} failed:`, error);
          }
        } else {
          attestationData[key] = value;
        }
      }
    }

    try {
      const encodedData = codec.encodeToBytes(attestationData);
      const packageAddress = getPackageAddress(chain, network as any);

      let txHash = '';
      if (selectedButton === 'offchain') {
        if (!account?.address) {
          throw new Error('Wallet account not available.');
        }

        const schemaSlug = schema.name || `schema-${schema.id}`;
        const uploadResponse = await uploadAptosOffChainData({
          schema_name: schemaSlug,
          data_base64: Buffer.from(encodedData).toString('base64'),
        });

        if (!uploadResponse.success) {
          throw new Error(uploadResponse.message || 'Failed to upload to Shelby.');
        }

        const upload = uploadResponse.data;
        const toBytes = (hex: string) =>
          Buffer.from(hex.replace(/^0x/, ''), 'hex');
        const dataHash = toBytes(upload.data_hash);
        const blobMerkleRootBytes = toBytes(upload.blob_merkle_root);
        const registerTxHashBytes = toBytes(upload.register_tx_hash);

        const response = await signAndSubmitTransaction({
          sender: account.address,
          data: {
            function: `${packageAddress}::aas::create_attestation_off_chain`,
            functionArguments: [
              recipient,
              schema.address,
              refAttestationId,
              expirationTime,
              isRevocable,
              dataHash,
              upload.account,
              upload.blob_name,
              blobMerkleRootBytes,
              registerTxHashBytes
            ]
          }
        });

        console.log('executed transaction', response);
        txHash = response.hash;
      } else {
        const response = await signAndSubmitTransaction({
          sender: account?.address,
          data: {
            function: `${packageAddress}::aas::create_attestation`,
            functionArguments: [
              recipient,
              schema.address,
              refAttestationId,
              expirationTime,
              isRevocable,
              encodedData
            ]
          }
        });

        console.log('executed transaction', response);
        txHash = response.hash;
      }

      try {
        await aptos.waitForTransaction({ transactionHash: txHash });
        setDigest(txHash);
        const hashToShow = txHash || 'Submitted';
        setAlertMessage(`Transaction submitted successfully!\n\nTransaction hash: ${hashToShow}`);
        setIsAlertOpen(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Transaction failed:', error);
        let errorMessage = 'Transaction failed. Please try again.';
        if (error instanceof Error) {
          errorMessage = `Transaction failed: ${error.message}`;
        }
        setAlertMessage(errorMessage);
        setIsAlertOpen(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error creating attestation:', error);
      setAlertMessage('Error creating attestation. Please check your input and try again.');
      setIsAlertOpen(true);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <section className="mv-panel-muted px-6 py-5 space-y-3">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-2">
              <p className="mv-kicker">Schema Attestation</p>
              <h1 className="mv-title text-3xl md:text-4xl">Create a new attestation</h1>
              <p className="mv-copy">Issue a signed statement using schema #{schema.id}.</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40 break-all">{schema.address}</p>
            </div>
            <div className="text-right space-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">
              <span>{chain.toUpperCase()} network</span>
              <span>{schemaItem.length} fields</span>
            </div>
          </div>
        </section>

        <section className="mv-panel px-5 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="mv-kicker">Schema Fields</p>
              <p className="text-xs text-black/50">Populate each attribute before submission.</p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">Required</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {schemaItem.map((field: SchemaField, index: number) => (
              <div key={index} className="border border-black/10 bg-white/72 px-4 py-3 space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60 flex items-center gap-2">
                  <span className="px-2 py-[2px] border border-black/10 text-[10px] tracking-[0.16em]">{field.type}</span>
                  {field.name}
                </Label>
                <Input
                  type="text"
                  placeholder={`Enter ${field.name} (${field.type})`}
                  value={fieldValues[field.name] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  className="mv-input w-full h-12 px-3 text-sm tracking-[0.08em]"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="mv-panel px-5 py-5 space-y-4">
          <div>
            <p className="mv-kicker">Basic Information</p>
            <p className="text-xs text-black/50">Recipient and expiration metadata.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">Recipient Address</Label>
              <Input
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="mv-input w-full h-12 px-3 text-sm uppercase tracking-[0.08em]"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">Expiration Time</Label>
              <Input
                type="number"
                placeholder="Unix timestamp (0 for none)"
                value={expirationTime}
                onChange={(e) => setExpirationTime(parseInt(e.target.value) || 0)}
                className="mv-input w-full h-12 px-3 text-sm uppercase tracking-[0.08em]"
              />
            </div>
          </div>
        </section>

        <section className="mv-panel px-5 py-5 space-y-4">
          <div>
            <p className="mv-kicker">Advanced Options</p>
            <p className="text-xs text-black/50">Add a reference ID and choose type.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">Reference Attestation ID</Label>
              <Input
                type="text"
                placeholder="0x..."
                value={refAttestationId}
                onChange={(e) => setRefAttestationId(e.target.value)}
                className="mv-input w-full h-12 px-3 text-sm uppercase tracking-[0.08em]"
              />
            </div>
            <div className="space-y-2">
              <p className="mv-kicker">Attestation Type</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleButtonClick('offchain')}
                  className={`flex-1 h-12 border font-mono text-[10px] uppercase tracking-[0.16em] transition ${selectedButton === 'offchain' ? 'border-transparent bg-[#5f9bff] text-white' : 'border-black/10 bg-white/72 text-black hover:bg-[#fbfbf8]'}`}
                >
                  Off-chain
                </button>
                <button
                  type="button"
                  onClick={() => handleButtonClick('onchain')}
                  className={`flex-1 h-12 border font-mono text-[10px] uppercase tracking-[0.16em] transition ${selectedButton === 'onchain' ? 'border-transparent bg-[#5f9bff] text-white' : 'border-black/10 bg-white/72 text-black hover:bg-[#fbfbf8]'}`}
                >
                  On-chain
                </button>
              </div>
              {selectedButton === 'offchain' && (
                <p className="text-[0.65rem] text-black/60">
                  Off-chain data is uploaded by the backend to Shelby. Your wallet only signs the final on-chain attestation.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mv-panel-muted px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="revocable"
              checked={isRevocable}
              onChange={handleRevocableChange}
              className="w-4 h-4 border border-black"
            />
            <Label htmlFor="revocable" className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">
              Make this attestation revocable
            </Label>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <Link
              href="/schemas"
              className="mv-btn-secondary px-4 py-2"
            >
              ← Back to Schemas
            </Link>
            <button
              type="button"
              onClick={handleCreateAttestation}
              disabled={isLoading || !connected}
              className="mv-btn-primary flex items-center justify-center gap-2 px-5 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Attestation'
              )}
            </button>
          </div>
        </section>
      </main>

      {digest && (
        <section className="mv-frame space-y-3 border border-black/10 bg-[rgba(245,249,255,0.92)] px-4 py-5">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-black/50">
            <span>Attestation created</span>
            <span>Transaction hash</span>
          </div>
          <p className="text-sm text-black break-all">{digest}</p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`${getExplorerTxUrl(chain)}/${digest}`}
              target="_blank"
              rel="noreferrer"
              className="mv-btn-secondary px-4 py-2"
            >
              View on explorer
            </a>
            <Link
              href="/attestations"
              className="mv-btn-secondary px-4 py-2"
            >
              View all attestations
            </Link>
          </div>
        </section>
      )}

      <AlertDialog.Root open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialog.Content className="mx-auto max-w-md border border-black/10 bg-white px-6 py-5">
          <AlertDialog.Title className="mv-heading text-lg mb-2">
            {alertMessage.includes('successfully') ? 'Success' : 'Notice'}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-black/70 mb-4 whitespace-pre-wrap">
            {alertMessage}
          </AlertDialog.Description>
          <Flex gap="3" justify="end">
            <AlertDialog.Cancel>
              <button className="mv-btn-secondary px-4 py-2">Close</button>
            </AlertDialog.Cancel>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </div>
  )
}
