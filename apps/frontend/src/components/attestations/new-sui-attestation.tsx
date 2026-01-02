"use client"

import { useState, useEffect, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/header"
import Link from 'next/link'
import { getAttestationRegistryId, getPackageId, Codec, SchemaField, Network, StorageType } from "@movera/sdk"
// WalrusClient and SealWrapper are imported dynamically to avoid WASM loading during build
import { Transaction } from "@mysten/sui/transactions"
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils"
import { getExplorerTxUrl } from "@/utils"
import { useCurrentWallet, useSignAndExecuteTransaction, useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHEX } from '@mysten/bcs';
import { AlertDialog, Flex } from "@radix-ui/themes"
import { Loader2 } from "lucide-react"
import { Chain } from "@/components/providers/chain-provider"
import { getNetwork } from "@/utils/utils"
import { Checkbox } from "@/components/ui/checkbox"

export function NewSuiAttestation({ chain, schema }: { chain: Chain, schema: any }) {
  const network = getNetwork() as Network;

  const { isConnected, currentWallet } = useCurrentWallet();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const [digest, setDigest] = useState('');
  const [storageType, setStorageType] = useState<StorageType>(StorageType.ON_CHAIN);
  const [isEncrypted, setIsEncrypted] = useState(false);

  const [fieldValues, setFieldValues] = useState<{ [key: string]: string }>({})

  const [recipient, setRecipient] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")
  const [expirationTime, setExpirationTime] = useState("")
  const [refAttestationId, setRefAttestationId] = useState("")
  const [isRevocable, setIsRevocable] = useState(false)

  const [resolverModule, setResolverModule] = useState("")

  const [isLoading, setIsLoading] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Use useMemo to avoid recreating these objects on every render
  const codec = useMemo(() => new Codec(schema.schema), [schema.schema]);
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

  const handleStorageTypeChange = (type: StorageType) => {
    setStorageType(type);
    // Reset encryption when switching to ON_CHAIN
    if (type === StorageType.ON_CHAIN) {
      setIsEncrypted(false);
    }
  }

  const handleRevocableChange = () => {
    setIsRevocable(!isRevocable)
  }

  const handleEncryptedChange = (checked: boolean) => {
    setIsEncrypted(checked);
    // Encryption is only available for OFF_CHAIN storage
    if (checked && storageType === StorageType.ON_CHAIN) {
      setStorageType(StorageType.OFF_CHAIN);
    }
  }

  const handleCreateAttestation = async () => {
    if (!isConnected || !currentAccount) {
      alert("Please connect wallet first!")
      return;
    }

    // Validate required fields
    if (!recipient || !recipient.trim()) {
      setAlertMessage('Error: Recipient address is required.');
      setIsAlertOpen(true);
      return;
    }

    // Validate Sui address format (basic check)
    if (!recipient.startsWith('0x') || recipient.length < 10) {
      setAlertMessage('Error: Invalid recipient address format. Please enter a valid Sui address (starting with 0x).');
      setIsAlertOpen(true);
      return;
    }

    if (!name || !name.trim()) {
      setAlertMessage('Error: Name is required.');
      setIsAlertOpen(true);
      return;
    }

    if (!description || !description.trim()) {
      setAlertMessage('Error: Description is required.');
      setIsAlertOpen(true);
      return;
    }

    if (!url || !url.trim()) {
      setAlertMessage('Error: URL is required.');
      setIsAlertOpen(true);
      return;
    }

    // Validate schema fields - all fields are required
    const missingFields: string[] = [];
    for (const field of schemaItem) {
      const value = fieldValues[field.name];
      if (!value || (typeof value === 'string' && !value.trim())) {
        missingFields.push(field.name);
      }
    }

    if (missingFields.length > 0) {
      setAlertMessage(`Error: The following schema fields are required: ${missingFields.join(', ')}`);
      setIsAlertOpen(true);
      return;
    }

    setIsLoading(true);

    // Encode attestation data
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
      const packageId = getPackageId(chain, network);
      const attestationRegistryId = getAttestationRegistryId(chain, network);

      // Convert expiration time to timestamp
      const expirationTimestamp = expirationTime
        ? BigInt(Math.floor(new Date(expirationTime).getTime()))
        : BigInt(0);

      // Encode data to Uint8Array using Codec (handles BigInt serialization correctly)
      // Codec.encodeToBytes() properly serializes BigInt values and uses BCS encoding
      const encodedData = codec.encodeToBytes(attestationData);
      let finalData = encodedData;
      let dataHash: Uint8Array | undefined;
      let walrusSuiObjectId: string | undefined;
      let walrusBlobIdBase64: string | undefined;
      let sealNonce: Uint8Array | undefined;

      // Handle OFF_CHAIN storage
      if (storageType === StorageType.OFF_CHAIN) {
        // Initialize Walrus client with upload relay and timeout configuration
        // Use upload relay to reduce request count and improve reliability
        // This reduces ~2200 requests to just a few requests handled by the relay server
        const { WalrusClient } = await import("@movera/sdk");
        const walrusClient = new WalrusClient(suiClient as any, {
          network,
          // Use upload relay to reduce request count and improve reliability
          // This significantly reduces the number of client requests
          uploadRelay: network === 'testnet' ? {
            host: 'https://upload-relay.testnet.walrus.space',
            sendTip: {
              max: 1_000, // Maximum tip in MIST (optional, relay will determine actual tip needed)
            },
          } : undefined, // Only use relay on testnet for now
          storageNodeClientOptions: {
            timeout: 60_000, // 60 seconds timeout for slow nodes
            onError: (error) => {
              // Log errors for debugging (optional)
              console.warn('Walrus storage node error:', error);
            },
          },
        });

        // Step 1: Calculate data hash of ORIGINAL data (before encryption)
        // This hash is stored on-chain and used to verify decrypted data integrity
        // Use blake2b256 from SDK to match Sui's hash::blake2b256
        const { blake2b256 } = await import("@movera/sdk");
        dataHash = blake2b256(encodedData);

        // Step 2: Generate nonce for Seal encryption (if encrypted)
        if (isEncrypted) {
          // Generate random nonce for Seal encryption
          sealNonce = crypto.getRandomValues(new Uint8Array(16));

          // Use default Seal key servers for the network (automatically configured)
          // For testnet, use Mysten Labs default key servers (Open mode, freely available)
          // For mainnet, users should configure their own key servers
          const testnetKeyServerIds = [
            '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', // mysten-testnet-1
            '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8', // mysten-testnet-2
          ];

          // Select key servers based on network
          const keyServerIds: string[] = network === 'testnet' ? testnetKeyServerIds : [];

          if (keyServerIds.length === 0) {
            throw new Error(`No Seal key servers configured for ${network}. Please configure key servers or use testnet for testing.`);
          }

          // Initialize Seal wrapper with default key servers
          const { SealWrapper } = await import("@movera/sdk");
          const sealWrapper = new SealWrapper(suiClient as any, {
            serverConfigs: keyServerIds.map((objectId: string) => ({
              objectId,
              weight: 1,
            })),
            verifyKeyServers: false, // Set to false for testnet
            timeout: 10_000,
          });

          // Compute Seal ID using nonce (not attestation_id)
          // For Private Data pattern, Seal ID = [attestor address][nonce]
          const { computeSealKeyId } = await import("@movera/sdk");
          const sealId = computeSealKeyId(currentAccount.address, sealNonce);

          // Create Seal policy for Private Data pattern
          // Note: seal_policy_id is not needed for Private Data pattern (we use nonce-based ID)
          const sealPolicy = {
            packageId,
            id: sealId, // Seal ID without packageId: [attestor][nonce]
            threshold: 1,
            keyServers: keyServerIds.map((objectId: string) => ({
              objectId,
              weight: 1,
            })),
          };

          // Encrypt data using Seal
          const { encryptedData } = await sealWrapper.encryptData(finalData, sealPolicy);
          // Convert to regular Uint8Array
          finalData = new Uint8Array(Array.from(encryptedData));
        }

        // Step 3: Upload to Walrus
        const epochs = 3; // Default to 3 epochs

        // Get Walrus signer from environment variable (dedicated account for Walrus storage)
        // This avoids wallet signer complexity and uses a dedicated account for all Walrus uploads
        const WALRUS_SECRET_KEY = process.env.NEXT_PUBLIC_SECRET_KEY;
        if (!WALRUS_SECRET_KEY) {
          throw new Error('Walrus secret key not configured. Please set NEXT_PUBLIC_SECRET_KEY environment variable.');
        }

        // Create keypair from secret key
        const walrusKeypair = Ed25519Keypair.fromSecretKey(fromHEX(WALRUS_SECRET_KEY));
        console.log('Using Walrus account:', walrusKeypair.toSuiAddress());

        // Optional: Get owner address from environment variable (defaults to signer address)
        const WALRUS_OWNER_ADDRESS = process.env.NEXT_PUBLIC_WALRUS_OWNER_ADDRESS;
        const walrusOwner = WALRUS_OWNER_ADDRESS || walrusKeypair.toSuiAddress();

        // Upload data to Walrus with retry logic 
        // Note: walrusSuiObjectId and walrusBlobIdBase64 are already declared at function scope
        let retries = 3;
        let lastError: Error | null = null;

        for (let i = 0; i < retries; i++) {
          try {
            console.log(`Attempting Walrus upload (attempt ${i + 1}/${retries})...`);
            // Upload data to Walrus using dedicated Walrus keypair as signer
            const uploadResult = await walrusClient.uploadData(
              finalData,
              walrusKeypair, // Use dedicated Walrus keypair as signer
              epochs,
              false,
              walrusOwner // Optional owner address (defaults to signer address in SDK)
            );
            walrusSuiObjectId = uploadResult.suiObjectId;
            walrusBlobIdBase64 = uploadResult.blobId;
            console.log('Uploaded to Walrus:');
            console.log('  Sui Object ID:', walrusSuiObjectId);
            console.log('  Blob ID (base64url):', walrusBlobIdBase64);
            console.log('  Owner:', walrusOwner);
            break; // Success, exit retry loop
          } catch (error: any) {
            lastError = error;
            console.warn(`Upload attempt ${i + 1} failed:`, error.message);
            if (i < retries - 1) {
              // Wait before retrying (exponential backoff)
              const waitTime = Math.pow(2, i) * 1000; // 1s, 2s, 4s
              console.log(`Waiting ${waitTime}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }

        if (!walrusSuiObjectId || !walrusBlobIdBase64) {
          throw new Error(
            `Failed to upload to Walrus after ${retries} attempts. Last error: ${lastError?.message || 'Unknown error'}. ` +
            `This may indicate that Walrus testnet nodes are temporarily unavailable. Please try again later.`
          );
        }
      }

      const tx = new Transaction();

      if (storageType === StorageType.ON_CHAIN) {
        // On-chain storage: call attest function
        tx.moveCall({
          target: `${packageId}::sas::attest`,
          arguments: [
            tx.object(schema.address),
            tx.object(attestationRegistryId),
            tx.pure.address(refAttestationId || "0x0"),
            tx.pure.address(recipient),
            tx.pure.u64(expirationTimestamp),
            tx.pure.vector('u8', Array.from(encodedData)),
            tx.pure.string(name),
            tx.pure.string(description),
            tx.pure.string(url),
            tx.object(SUI_CLOCK_OBJECT_ID)
          ]
        });
      } else {
        // Off-chain storage: call attest_off_chain function
        if (!walrusSuiObjectId || !walrusBlobIdBase64 || !dataHash) {
          throw new Error('Walrus Sui object ID, blob ID, and data hash are required for off-chain storage');
        }

        // Convert walrusBlobId (base64url string) to bytes
        const walrusBlobIdBytes = new TextEncoder().encode(walrusBlobIdBase64);

        tx.moveCall({
          target: `${packageId}::sas::attest_off_chain`,
          arguments: [
            tx.object(schema.address),
            tx.object(attestationRegistryId),
            tx.pure.address(refAttestationId || "0x0"),
            tx.pure.address(recipient),
            tx.pure.u64(expirationTimestamp),
            tx.pure.address(walrusSuiObjectId),
            tx.pure.vector('u8', Array.from(walrusBlobIdBytes)),
            tx.pure.vector('u8', Array.from(dataHash)),
            tx.pure.bool(isEncrypted),
            isEncrypted && sealNonce
              ? tx.pure.option('vector<u8>', Array.from(sealNonce))
              : tx.pure.option('vector<u8>', null),
            tx.pure.option('address', null), // seal_policy_id is optional (for other patterns)
            tx.pure.string(name),
            tx.pure.string(description),
            tx.pure.string(url),
            tx.object(SUI_CLOCK_OBJECT_ID)
          ]
        });
      }

      signAndExecuteTransaction({
        transaction: tx as any,
      }, {
        onSuccess: async (result) => {
          console.log('executed transaction', result);
          setDigest(result.digest);
          setAlertMessage(`Transaction submitted successfully!\n\nTransaction hash: ${result.digest}`);
          setIsAlertOpen(true);
          setIsLoading(false);
          // mutateAttestations();
          // mutateSchemas();
        },
        onError: (error) => {
          console.error('Transaction failed:', error);
          let errorMessage = 'Transaction failed. Please try again.';
          if (error instanceof Error) {
            errorMessage = `Transaction failed: ${error.message}`;
          }
          setAlertMessage(errorMessage);
          setIsAlertOpen(true);
          setIsLoading(false);
        },
      });
    } catch (error: any) {
      console.error('Error creating attestation:', error);

      // Provide more detailed error messages
      let errorMessage = 'Error creating attestation. ';

      if (error?.message) {
        // Include the actual error message
        errorMessage += error.message;

        // Add helpful context for common errors
        if (error.message.includes('recipient') || error.message.includes('Recipient')) {
          errorMessage += ' Please check the recipient address format.';
        } else if (error.message.includes('wallet') || error.message.includes('signer')) {
          errorMessage += ' Please ensure your wallet is connected and try again.';
        } else if (error.message.includes('Walrus') || error.message.includes('walrus')) {
          errorMessage += ' There was an issue uploading data to Walrus. Please try again.';
        } else if (error.message.includes('Seal') || error.message.includes('seal')) {
          errorMessage += ' There was an issue with Seal encryption. Please check your configuration.';
        } else if (error.message.includes('insufficient gas') || error.message.includes('gas')) {
          errorMessage += ' You may have insufficient SUI tokens. Please ensure you have enough balance.';
        } else if (error.message.includes('schema') || error.message.includes('Schema')) {
          errorMessage += ' Please check the schema address and ensure it exists on the network.';
        }
      } else {
        errorMessage += 'Please check your input and try again.';
      }

      setAlertMessage(errorMessage);
      setIsAlertOpen(true);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <section className="border border-black bg-[#F4F7FF] px-6 py-5 space-y-3">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.3em] text-black/60">Schema Attestation</p>
              <h1 className="text-3xl font-black">Create a new attestation</h1>
              <p className="text-sm font-bold text-black/60">Issue a signed statement based on schema #{schema.id}.</p>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/40 break-all">{schema.address}</p>
            </div>
            <div className="text-right space-y-1 text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/40">
              <span>{chain.toUpperCase()} network</span>
              <span>{schemaItem.length} fields</span>
            </div>
          </div>
        </section>

        <section className="border border-black bg-white px-5 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Schema Fields</p>
              <p className="text-xs font-bold text-black/50">Fill each field exactly as defined by the schema.</p>
            </div>
            <span className="text-[0.6rem] font-black uppercase tracking-[0.3em] text-black/40">Required</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {schemaItem.map((field: SchemaField, index: number) => (
              <div key={index} className="border border-black px-4 py-3 space-y-2">
                <Label className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-black/60 flex items-center gap-2">
                  <span className="px-2 py-[2px] border border-black text-[0.6rem] font-black tracking-[0.3em]">{field.type}</span>
                  {field.name}
                </Label>
                <Input
                  type="text"
                  placeholder={`Enter ${field.name} (${field.type})`}
                  value={fieldValues[field.name] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  className="w-full h-12 px-3 border border-black text-sm font-semibold tracking-[0.1em] focus:outline-none"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="border border-black bg-white px-5 py-5 space-y-4">
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Basic Information</p>
            <p className="text-xs font-bold text-black/50">Recipient and metadata for this attestation.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">
                Recipient Address <span className="text-red-600">*</span>
              </Label>
              <Input
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full h-12 px-3 border border-black text-sm font-semibold tracking-[0.1em] focus:outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">
                Name <span className="text-red-600">*</span>
              </Label>
              <Input
                type="text"
                placeholder="Attestation name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-3 border border-black text-sm font-semibold tracking-[0.1em] focus:outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">
                Description <span className="text-red-600">*</span>
              </Label>
              <Input
                type="text"
                placeholder="Attestation description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-12 px-3 border border-black text-sm font-semibold tracking-[0.1em] focus:outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">
                URL <span className="text-red-600">*</span>
              </Label>
              <Input
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full h-12 px-3 border border-black text-sm font-semibold tracking-[0.1em] focus:outline-none"
                required
              />
            </div>
          </div>
        </section>

        <section className="border border-black bg-white px-5 py-5 space-y-4">
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Advanced Options</p>
            <p className="text-xs font-bold text-black/50">Set optional metadata and type preferences.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Expiration Time</Label>
              <Input
                type="datetime-local"
                value={expirationTime}
                onChange={(e) => setExpirationTime(e.target.value)}
                className="w-full h-12 px-3 border border-black text-sm font-semibold tracking-[0.1em] focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Reference Attestation ID</Label>
              <Input
                type="text"
                placeholder="0x..."
                value={refAttestationId}
                onChange={(e) => setRefAttestationId(e.target.value)}
                className="w-full h-12 px-3 border border-black text-sm font-semibold tracking-[0.1em] focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Resolver Module</Label>
              <Input
                type="text"
                placeholder="Resolver module address"
                value={resolverModule}
                onChange={(e) => setResolverModule(e.target.value)}
                className="w-full h-12 px-3 border border-black text-sm font-semibold tracking-[0.1em] focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60 mb-2">Storage Type</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleStorageTypeChange(StorageType.ON_CHAIN)}
                  className={`flex-1 h-12 border border-black font-black uppercase tracking-[0.3em] transition ${storageType === StorageType.ON_CHAIN
                      ? 'bg-[#2792FF] text-white'
                      : 'bg-white text-black hover:bg-[#F4F7FF]'
                    }`}
                >
                  On-chain
                </button>
                <button
                  type="button"
                  onClick={() => handleStorageTypeChange(StorageType.OFF_CHAIN)}
                  className={`flex-1 h-12 border border-black font-black uppercase tracking-[0.3em] transition ${storageType === StorageType.OFF_CHAIN
                      ? 'bg-[#2792FF] text-white'
                      : 'bg-white text-black hover:bg-[#F4F7FF]'
                    }`}
                >
                  Off-chain (Walrus)
                </button>
              </div>
            </div>

            {storageType === StorageType.OFF_CHAIN && (
              <div className="border border-black bg-[#F4F7FF] px-4 py-3 space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="encrypted"
                    checked={isEncrypted}
                    onCheckedChange={(checked) => handleEncryptedChange(checked === true)}
                    className="w-4 h-4 border border-black"
                  />
                  <Label htmlFor="encrypted" className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60 cursor-pointer">
                    Encrypt data with Seal
                  </Label>
                </div>

                {isEncrypted && (
                  <div className="pl-7">
                    <div className="border border-black bg-white px-4 py-3">
                      <p className="text-xs font-bold text-black/70">
                        Seal encryption is configured automatically using the Private Data pattern.
                      </p>
                      <p className="text-xs font-bold text-black/50 mt-1">
                        • Access control: Only the recipient can decrypt
                      </p>
                      <p className="text-xs font-bold text-black/50">
                        • Key servers: Using default {network} key servers
                      </p>
                      <p className="text-xs font-bold text-black/50">
                        • Seal ID: Generated from [attestor address][nonce]
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="border border-black bg-[#F4F7FF] px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="revocable"
              checked={isRevocable}
              onChange={handleRevocableChange}
              className="w-4 h-4 border border-black"
            />
            <Label htmlFor="revocable" className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">
              Make this attestation revocable
            </Label>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <Link
              href="/schemas"
              className="border border-black px-4 py-2 text-xs font-black uppercase tracking-[0.3em]"
            >
              ← Back to Schemas
            </Link>
            <button
              type="button"
              onClick={handleCreateAttestation}
              disabled={isLoading || !isConnected}
              className="flex items-center justify-center gap-2 border border-black bg-[#2792FF] text-white px-5 py-2 text-xs font-black uppercase tracking-[0.3em] disabled:opacity-50 disabled:cursor-not-allowed"
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
        <section className="max-w-6xl mx-auto px-4 py-5 space-y-3 border border-black bg-[#F4FFF9]">
          <div className="flex items-center justify-between text-[0.6rem] font-black uppercase tracking-[0.3em] text-black/50">
            <span>Attestation created</span>
            <span>Transaction hash</span>
          </div>
          <p className="text-sm font-black text-black break-all">{digest}</p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`${getExplorerTxUrl(chain)}/${digest}`}
              target="_blank"
              rel="noreferrer"
              className="border border-black px-4 py-2 text-xs font-black uppercase tracking-[0.3em]"
            >
              View on explorer
            </a>
            <Link
              href="/attestations"
              className="border border-black px-4 py-2 text-xs font-black uppercase tracking-[0.3em]"
            >
              View all attestations
            </Link>
          </div>
        </section>
      )}

      <AlertDialog.Root open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialog.Content className="bg-white border border-black px-6 py-5 max-w-md mx-auto">
          <AlertDialog.Title className="text-lg font-black text-black mb-2">
            {alertMessage.includes('successfully') ? 'Success' : 'Notice'}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-black/70 mb-4 whitespace-pre-wrap">
            {alertMessage}
          </AlertDialog.Description>
          <Flex gap="3" justify="end">
            <AlertDialog.Cancel>
              <button className="px-4 py-2 border border-black text-xs font-black uppercase tracking-[0.3em]">Close</button>
            </AlertDialog.Cancel>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </div>
  )
}
