'use client'

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Codec, getAttestationData, Network, StorageType } from "@movera/sdk";
// WalrusClient and SealWrapper are imported dynamically to avoid WASM loading during build
import { getExplorerUrl, getExplorerTxUrl, getNetwork } from "@/utils/utils";
import { Chain } from "@/components/providers/chain-provider";
import { useCurrentWallet, useSignAndExecuteTransaction, useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { Transaction } from "@mysten/sui/transactions";
import { getPackageId } from "@movera/sdk";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, LockOpen } from "lucide-react";

const formatValue = (value: any): string => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'string' && value.endsWith('n')) {
    // Only convert string to BigInt if it's a valid number string ending with 'n'
    // This handles cases where BigInt values are serialized as strings like "123n"
    if (typeof value === 'string' && value.endsWith('n')) {
      const numberPart = value.slice(0, -1);
      // Check if it's a valid integer string (allow negative sign)
      if (/^-?\d+$/.test(numberPart)) {
        try {
          return BigInt(numberPart).toString();
        } catch (error) {
          // If conversion fails, return original string
          return value;
        }
      }
      // Not a valid number string, return as-is (e.g., "Alice Chen" wouldn't match)
      return value;
    }
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    );
  }
  return String(value);
};

export function SuiAttestation({ chain, attestation }: { chain: Chain; attestation: any }) {
  const network = getNetwork() as Network;
  const { isConnected } = useCurrentWallet();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  // Convert to number for comparison (backend may return string)
  const storageType = Number(attestation.storage_type ?? 0);
  const isEncrypted = attestation.encrypted === true;
  const isOffChain = storageType === StorageType.OFF_CHAIN;

  const [decodedData, setDecodedData] = useState<any>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [decryptedDataBytes, setDecryptedDataBytes] = useState<Uint8Array | null>(null);
  const [offChainRawData, setOffChainRawData] = useState<Uint8Array | null>(null);
  const [walrusBlobId, setWalrusBlobId] = useState<string | null>(null);
  const [isLoadingOffChain, setIsLoadingOffChain] = useState(false);

  // Initialize codec and decode data for ON_CHAIN
  useEffect(() => {
    if (!isOffChain) {
      try {
        if (attestation.data && attestation.schema_data) {
          const codec = new Codec(attestation.schema_data);
          const decoded = codec.decode(attestation.data);
          setDecodedData(decoded);
        }
      } catch (error) {
        console.error('Error decoding data:', error);
        setDecodedData(null);
      }
    }
  }, [attestation, isOffChain]);

  // Load off-chain data (both encrypted and non-encrypted)
  // For encrypted data, we load the encrypted raw data but don't decode it
  // For non-encrypted data, we load and decode the data
  useEffect(() => {
    if (isOffChain && (attestation.walrus_blob_id || attestation.walrus_sui_object_id)) {
      const loadOffChainData = async () => {
        setIsLoadingOffChain(true);
        setDecryptError(null); // Clear any previous errors
        try {
          const { getClient, WalrusClient } = await import("@movera/sdk");
          const client = getClient(chain, network);
          const walrusClient = new WalrusClient(client, { network });

          // Use walrusBlobId if available (direct), otherwise use suiObjectId
          let blobId: string;
          let rawData: Uint8Array;

          const maxAttempts = 5;
          const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
          const shouldRetry = (message: string) =>
            message.toLowerCase().includes('not certified');

          const downloadWithRetry = async () => {
            let lastError: Error | null = null;
            for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
              try {
                if (attestation.walrus_blob_id) {
                  blobId = attestation.walrus_blob_id;
                  setWalrusBlobId(blobId);
                  return await walrusClient.downloadData(blobId, true);
                }
                if (attestation.walrus_sui_object_id) {
                  blobId = await walrusClient.getBlobIdFromObjectId(attestation.walrus_sui_object_id);
                  setWalrusBlobId(blobId);
                  return await walrusClient.downloadData(attestation.walrus_sui_object_id, false);
                }
                throw new Error('Either walrus_blob_id or walrus_sui_object_id is required');
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                lastError = err instanceof Error ? err : new Error(message);
                if (attempt < maxAttempts - 1 && shouldRetry(message)) {
                  await sleep(1500 * (attempt + 1));
                  continue;
                }
                throw lastError;
              }
            }
            throw lastError ?? new Error('Failed to load off-chain data');
          };

          rawData = await downloadWithRetry();

          // Set raw data state (this is encrypted data for encrypted attestations)
          setOffChainRawData(rawData);

          // Only decode data if it's NOT encrypted and schema is available
          if (!isEncrypted && attestation.schema_data) {
            try {
              const codec = new Codec(attestation.schema_data);
              // Use decodeFromBytes to decode Uint8Array directly
              const decoded = codec.decodeFromBytes(rawData);
              setDecodedData(decoded);
              console.log('Decoded off-chain data:', decoded);
            } catch (decodeError) {
              console.error('Error decoding off-chain data:', decodeError);
              // Don't set error for decode failures, just log it
              // The raw data is still available
            }
          }
        } catch (error) {
          console.error('Error loading off-chain data:', error);
          const message = error instanceof Error ? error.message : 'Unknown error';
          if (message.toLowerCase().includes('not certified')) {
            setDecryptError('Off-chain data is not certified yet. Please refresh in a moment.');
          } else {
            setDecryptError(`Failed to load off-chain data: ${message}`);
          }
        } finally {
          setIsLoadingOffChain(false);
        }
      };

      loadOffChainData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffChain, attestation.walrus_blob_id, attestation.walrus_sui_object_id, attestation.schema_data, chain, network]);

  const toDate = (value?: string) => {
    if (!value) return '—';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '—';
    return new Date(numeric).toUTCString();
  };

  const handleDecrypt = async () => {
    if (!isConnected || !currentAccount) {
      setDecryptError('Please connect your wallet first');
      return;
    }

    setIsDecrypting(true);
    setDecryptError(null);

    try {
      // Get attestation from chain to ensure we have latest data
      const { getAttestation, getClient } = await import("@movera/sdk");
      const client = getClient(chain, network);
      const chainAttestation = await getAttestation(attestation.address, chain, network);

      if (!chainAttestation.sealNonce) {
        throw new Error('Seal nonce not found in attestation');
      }

      // Initialize WalrusClient and SealWrapper
      const { WalrusClient, SealWrapper } = await import("@movera/sdk");
      const suiClient = client;
      const walrusClient = new WalrusClient(suiClient, {
        network,
        uploadRelay: {
          host: 'https://upload-relay.testnet.walrus.space',
          sendTip: {
            max: 1_000,
          },
        },
      });

      // Use Mysten Labs testnet Seal key servers (Open mode, freely available)
      // These are the default testnet key servers provided by Mysten Labs
      // See: https://github.com/MystenLabs/seal/blob/main/docs/Pricing.md
      const testnetKeyServerIds = [
        '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', // mysten-testnet-1
        '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8', // mysten-testnet-2
      ];

      const sealConfig = {
        serverConfigs: testnetKeyServerIds.map((objectId) => ({
          objectId,
          weight: 1,
        })),
        verifyKeyServers: false, // Set to false for testnet to avoid verification overhead
        timeout: 10_000,
      };
      const sealWrapper = new SealWrapper(suiClient, sealConfig);

      // Create transaction bytes for seal_approve
      const packageId = getPackageId(chain, network);
      const tx = new Transaction();

      // Compute key ID: [attestor_address][nonce]
      const { computeSealKeyId } = await import("@movera/sdk");
      const attestorAddr = chainAttestation.attestor;
      const sealIdHex = computeSealKeyId(attestorAddr, chainAttestation.sealNonce!);

      // Convert hex string to bytes array
      const keyIdBytes = Array.from(Buffer.from(sealIdHex, 'hex'));

      tx.moveCall({
        target: `${packageId}::seal_access::seal_approve`,
        arguments: [
          tx.pure.vector('u8', keyIdBytes),
          tx.object(attestation.address),
        ],
      });

      // Build transaction to get bytes
      // Use onlyTransactionKind: true for Seal - we only need the transaction kind bytes
      // Seal key servers will use dry_run_transaction_block to verify the transaction
      const txBytes = await tx.build({
        client: suiClient,
        onlyTransactionKind: true  // Only get transaction kind bytes, no sender/gas needed
      });

      // Use already loaded encrypted data if available, otherwise download from Walrus
      let encryptedData: Uint8Array;
      if (offChainRawData) {
        // Use already loaded data
        encryptedData = offChainRawData;
      } else {
        // Download encrypted data from Walrus if not already loaded
        if (chainAttestation.walrusBlobId) {
          encryptedData = await walrusClient.downloadData(chainAttestation.walrusBlobId, true);
        } else if (chainAttestation.walrusSuiObjectId) {
          encryptedData = await walrusClient.downloadData(chainAttestation.walrusSuiObjectId, false);
        } else {
          throw new Error('Walrus blob ID or Sui object ID not found');
        }
      }

      // Parse encrypted object to get package ID (needed for SessionKey)
      const { EncryptedObject, SessionKey } = await import('@mysten/seal');
      const encryptedObj = EncryptedObject.parse(encryptedData);
      const encryptedPackageId = encryptedObj.packageId;

      // Create SessionKey manually (without signer, so we can sign it manually via dapp-kit)
      const sessionKey = await SessionKey.create({
        address: currentAccount.address,
        packageId: encryptedPackageId,
        ttlMin: 30,
        suiClient: suiClient as any,
      });

      // Sign personal message using dapp-kit hook
      const personalMessage = sessionKey.getPersonalMessage();
      const { signature } = await signPersonalMessage({
        message: personalMessage,
      });

      // Set signature to SessionKey
      await sessionKey.setPersonalMessageSignature(signature);

      // Decrypt data using SealWrapper
      const decryptedData = await sealWrapper.decryptData(
        encryptedData,
        sessionKey,
        txBytes,
        true // checkShareConsistency
      );

      // Verify data integrity
      // dataHash should be calculated from ORIGINAL data (before encryption) using blake2b256
      // We verify by calculating hash of decrypted data and comparing with stored hash
      if (chainAttestation.dataHash) {
        // Use blake2b256 from SDK to match Sui's hash::blake2b256
        const { blake2b256 } = await import("@movera/sdk");
        const hash = blake2b256(decryptedData);

        // Ensure expectedHash is a proper Uint8Array
        // chainAttestation.dataHash should already be Uint8Array from SDK parsing
        let expectedHash: Uint8Array;
        if (chainAttestation.dataHash instanceof Uint8Array) {
          expectedHash = chainAttestation.dataHash;
        } else if (Array.isArray(chainAttestation.dataHash)) {
          expectedHash = new Uint8Array(chainAttestation.dataHash);
        } else if (typeof chainAttestation.dataHash === 'string') {
          // If it's a string, try to decode it as base64
          expectedHash = Uint8Array.from(atob(chainAttestation.dataHash), c => c.charCodeAt(0));
        } else {
          expectedHash = new Uint8Array(chainAttestation.dataHash);
        }

        // Compare Uint8Array
        if (hash.length !== expectedHash.length) {
          throw new Error('Data integrity verification failed: hash length mismatch');
        }
        for (let i = 0; i < hash.length; i++) {
          if (hash[i] !== expectedHash[i]) {
            throw new Error('Data integrity verification failed: hash mismatch');
          }
        }
      }

      setDecryptedDataBytes(decryptedData);

      // Decode decrypted data
      if (attestation.schema_data) {
        const codec = new Codec(attestation.schema_data);
        // Use decodeFromBytes to decode Uint8Array directly
        const decoded = codec.decodeFromBytes(decryptedData);
        setDecodedData(decoded);
      }
    } catch (error: any) {
      console.error('Decryption error:', error);

      // Provide more user-friendly error messages
      let errorMessage = 'Failed to decrypt data.';

      // Check if it's a Seal SDK error
      if (error?.name || error?.constructor?.name) {
        const errorType = error.name || error.constructor.name;

        // Check for NoAccessError or access-related errors
        if (errorType === 'NoAccessError' ||
          error.message?.includes('NoAccess') ||
          error.message?.includes('no access') ||
          error.message?.includes('access denied')) {
          errorMessage = 'Access denied: You are not authorized to decrypt this data. Only the recipient of this attestation can decrypt it.';
        }
        // Check for InvalidParameterError that might indicate access control failure
        else if (errorType === 'InvalidParameterError' ||
          error.message?.includes('PTB contains an invalid parameter') ||
          error.message?.includes('newly created object that the FN has not yet seen')) {
          // This error often indicates access control failure (the transaction fails because user doesn't have permission)
          // Check if current user is the recipient
          if (currentAccount?.address !== attestation.recipient) {
            errorMessage = 'Access denied: You are not the recipient of this attestation. Only the recipient can decrypt the encrypted data.';
          } else {
            errorMessage = 'Decryption failed: The transaction could not be verified. This may be due to network issues or access control policy. Please try again later.';
          }
        }
        // Check for signature errors
        else if (errorType === 'InvalidSignatureError' ||
          errorType === 'InvalidUserSignatureError' ||
          error.message?.includes('signature') ||
          error.message?.includes('Signature')) {
          errorMessage = 'Signature verification failed: Please ensure you are connected with the correct wallet and try again.';
        }
        // Check for session key errors
        else if (errorType === 'ExpiredSessionKeyError' ||
          error.message?.includes('session') ||
          error.message?.includes('Session')) {
          errorMessage = 'Session expired: Please try decrypting again.';
        }
        // Generic Seal API error
        else if (errorType?.includes('Error') || errorType?.includes('Seal')) {
          errorMessage = `Decryption failed: ${error.message || 'Please ensure you are the recipient of this attestation and try again.'}`;
        }
        // Use the original error message if it's informative
        else if (error.message && !error.message.includes('PTB contains an invalid parameter')) {
          errorMessage = error.message;
        }
      } else if (error.message) {
        // Handle string error messages
        if (error.message.includes('PTB contains an invalid parameter') ||
          error.message.includes('newly created object')) {
          if (currentAccount?.address !== attestation.recipient) {
            errorMessage = 'Access denied: You are not the recipient of this attestation. Only the recipient can decrypt the encrypted data.';
          } else {
            errorMessage = 'Decryption failed: The transaction could not be verified. Please try again later.';
          }
        } else {
          errorMessage = error.message;
        }
      }

      setDecryptError(errorMessage);
    } finally {
      setIsDecrypting(false);
    }
  };

  const item = attestation.schema_data ? new Codec(attestation.schema_data).schemaItem() : [];
  const hasData = decodedData !== null;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Header />
      <main className="mv-frame max-w-5xl space-y-6 py-8">
        <section className="mv-panel-muted px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="mv-kicker">Attestation Detail</p>
              <h1 className="mv-title mt-3 text-3xl md:text-4xl">
                {isOffChain ? 'Off-chain Attestation' : 'On-chain Attestation'}
                {isEncrypted && (
                  <span className="mv-tag ml-3 inline-flex items-center gap-1 border-[#f1d7b0] bg-[#fff3df] px-2 py-1 text-[#b96a1b]">
                    <Lock className="w-3 h-3" />
                    ENCRYPTED
                  </span>
                )}
              </h1>
              <p className="mv-copy mt-3">Ledger reference: {attestation.address}</p>
            </div>
            {isOffChain && (
              <div className="flex gap-2">
                {isOffChain && !isEncrypted && (
                  <span className="mv-accent-tag whitespace-nowrap px-3 py-1">
                    OFF CHAIN
                  </span>
                )}
                {isEncrypted && !hasData && (
                  <Button
                    onClick={handleDecrypt}
                    disabled={isDecrypting || !isConnected || (isOffChain && isLoadingOffChain && !offChainRawData)}
                    className="mv-btn-primary flex h-11 items-center gap-2 whitespace-nowrap px-4 disabled:opacity-50"
                  >
                    {isDecrypting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Decrypting...
                      </>
                    ) : (isOffChain && isLoadingOffChain && !offChainRawData) ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <LockOpen className="w-3 h-3" />
                        Decrypt Data
                      </>
                    )}
                  </Button>
                )}
                {isEncrypted && hasData && (
                  <span className="mv-tag inline-flex items-center gap-1 whitespace-nowrap border-[#c9e7da] bg-[#eefaf3] px-3 py-1 text-[#18794e]">
                    <LockOpen className="w-3 h-3" />
                    DECRYPTED
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="mv-panel space-y-4 px-6 py-5">
          <div><p className="mv-kicker">Basic Information</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">UID</p>
              <a href={`${getExplorerUrl(chain)}/object/${attestation.address}`} className="mt-2 block break-all font-mono text-xs text-black transition-colors hover:text-[#5f9bff]">
                {attestation.address}
              </a>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Schema</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-none text-black">{attestation.schema_name || `Schema #${attestation.schema_id ?? '—'}`}</p>
              <a href={`/schema/${attestation.schema_address}`} className="mt-2 block break-all font-mono text-xs text-black/55 transition-colors hover:text-[#5f9bff]">
                {attestation.schema_address}
              </a>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Created</p>
              <p className="mt-2 text-sm text-black/72">{toDate(attestation.time)}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Revocable</p>
              <p className="mt-2 text-sm text-black/72">{attestation.revocable ? 'Yes' : 'No'}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Expiration</p>
              <p className="mt-2 text-sm text-black/72">{toDate(attestation.expiration_time)}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Revoked</p>
              <p className="mt-2 text-sm text-black/72">{attestation.revocation_time && attestation.revocation_time !== '0' ? toDate(attestation.revocation_time) : 'No'}</p>
            </div>
          </div>
        </section>

        <section className="mv-panel space-y-4 px-6 py-5">
          <div><p className="mv-kicker">Participants</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Attestor</p>
              <a href={`/address/${attestation.attestor}`} className="mt-2 block break-all font-mono text-xs text-black transition-colors hover:text-[#5f9bff]">
                {attestation.attestor}
              </a>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Recipient</p>
              <a href={`/address/${attestation.recipient}`} className="mt-2 block break-all font-mono text-xs text-black transition-colors hover:text-[#5f9bff]">
                {attestation.recipient}
              </a>
            </div>
          </div>
        </section>

        {isOffChain && isEncrypted && !hasData && (
          <section className="mv-panel space-y-4 border-[#f1d7b0] bg-[#fff7ec] px-6 py-5">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 text-[#b96a1b]" />
              <div className="flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#b96a1b]">Encrypted Data</p>
                <p className="mv-copy mt-3 mb-4">
                  This attestation contains encrypted data stored off-chain.
                  {isConnected ?
                    ' Click the "Decrypt Data" button above to view the contents.' :
                    ' Please connect your wallet to decrypt and view the data.'
                  }
                </p>
                {decryptError && (
                  <div className="border border-[#efc0b8] bg-[#fff2ef] px-4 py-3">
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#b42318]">{decryptError}</p>
                  </div>
                )}
                {isOffChain && (attestation.walrus_sui_object_id || attestation.walrus_blob_id) && (
                  <div className="mt-3 space-y-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Storage Information</p>
                    {attestation.walrus_sui_object_id && (
                      <p className="text-xs font-mono text-black/70 break-all">
                        <span className="font-bold">Walrus Sui Object ID:</span> {attestation.walrus_sui_object_id}
                      </p>
                    )}
                    {attestation.walrus_blob_id && (
                      <p className="text-xs font-mono text-black/70 break-all">
                        <span className="font-bold">Walrus Blob ID (Base64url):</span> {attestation.walrus_blob_id}
                      </p>
                    )}
                    {/* {walrusBlobId && attestation.walrus_sui_object_id && (
                      <p className="text-xs font-mono text-black/70 break-all">
                        <span className="font-bold">Walrus Blob ID (Base64url, fetched):</span> {walrusBlobId}
                      </p>
                    )} */}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Decoded Data section - show loading mask when loading off-chain data */}
        {(hasData || (isOffChain && !isEncrypted && isLoadingOffChain) || (isOffChain && isEncrypted && isDecrypting)) && (
          <section className="mv-panel relative space-y-4 px-6 py-5">
            <div><p className="mv-kicker">Decoded Data</p></div>
            {/* Loading mask */}
            {((isOffChain && !isEncrypted && isLoadingOffChain) || (isOffChain && isEncrypted && isDecrypting)) && !hasData && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-[#5f9bff]" />
                  <p className="mv-copy">
                    {isOffChain && isEncrypted ? 'Decrypting and decoding data...' : 'Loading and decoding data...'}
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {hasData ? (
                item.map((field: any, index: number) => (
                  <div key={index} className="mv-panel-muted space-y-2 px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">{field.type}</p>
                    <p className="mv-heading text-[1.55rem]">{field.name}</p>
                    <p className="font-mono text-xs text-black/72 break-all">{formatValue(decodedData[field.name])}</p>
                  </div>
                ))
              ) : (
                // Show skeleton while loading
                item.map((field: any, index: number) => (
                  <div key={index} className="mv-panel-muted px-4 py-3 opacity-50">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">{field.type}</p>
                    <p className="mv-heading mt-2 text-[1.55rem]">{field.name}</p>
                    <div className="mt-2 h-4 animate-pulse bg-black/8"></div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {isOffChain && !isEncrypted && (
          <section className="mv-panel space-y-4 px-6 py-5">
            <div><p className="mv-kicker">Off-chain Storage Information</p></div>
            <div className="space-y-3">
              {attestation.walrus_sui_object_id && (
                <div className="mv-panel-muted px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Walrus Sui Object ID</p>
                  <p className="mt-2 font-mono text-xs text-black break-all">
                    {attestation.walrus_sui_object_id}
                  </p>
                  <a
                    href={`${getExplorerUrl(chain)}/object/${attestation.walrus_sui_object_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block font-mono text-xs uppercase tracking-[0.16em] text-[#5f9bff] hover:underline"
                  >
                    View on Explorer
                  </a>
                </div>
              )}
              <div className="mv-panel-muted px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Walrus Blob ID (Base64url)</p>
                {isLoadingOffChain && !attestation.walrus_blob_id ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/45">Loading...</p>
                  </div>
                ) : (
                  <p className="mt-2 font-mono text-xs text-black break-all">
                    {attestation.walrus_blob_id || walrusBlobId || '—'}
                  </p>
                )}
              </div>
            </div>
            {decryptError && (
              <div className="border border-[#efc0b8] bg-[#fff2ef] px-4 py-3">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#b42318]">{decryptError}</p>
              </div>
            )}
          </section>
        )}

        <section className="mv-panel space-y-4 px-6 py-5">
          <div><p className="mv-kicker">Transaction Information</p></div>
          <div className="grid gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Transaction ID</p>
              <a href={`${getExplorerTxUrl(chain)}/${attestation.tx_hash}`} className="mt-2 block break-all font-mono text-xs text-black transition-colors hover:text-[#5f9bff]">
                {attestation.tx_hash}
              </a>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Reference</p>
              <p className="mt-2 text-sm text-black/72">{attestation.ref_attestation && attestation.ref_attestation !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? attestation.ref_attestation : 'No reference'}</p>
            </div>
          </div>
        </section>

        {/* Raw Data section - show for all attestations, with loading mask when loading off-chain data */}
        {(!isOffChain && attestation.data) ||
          (isOffChain && (offChainRawData || isLoadingOffChain || (isEncrypted && decryptedDataBytes))) ? (
          <section className="mv-panel relative space-y-4 px-6 py-5">
            <div className="flex items-center gap-2">
              <p className="mv-kicker">Raw Data</p>
              {isOffChain && isEncrypted && offChainRawData && !decryptedDataBytes && (
                <span className="mv-tag inline-flex items-center gap-1 border-[#f1d7b0] bg-[#fff3df] px-2 py-0.5 text-[#b96a1b]">
                  <Lock className="w-2.5 h-2.5" />
                  ENCRYPTED
                </span>
              )}
            </div>
            {/* Loading mask for off-chain data */}
            {isOffChain && isLoadingOffChain && !offChainRawData ? (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-[#5f9bff]" />
                  <p className="mv-copy">
                    Loading raw data...
                  </p>
                </div>
              </div>
            ) : null}
            {/* Loading mask when decrypting */}
            {isOffChain && isEncrypted && isDecrypting && !decryptedDataBytes && offChainRawData ? (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-[#5f9bff]" />
                  <p className="mv-copy">
                    Decrypting raw data...
                  </p>
                </div>
              </div>
            ) : null}
            <div className="border border-black/10 bg-[#fbfbf8] px-4 py-3 space-y-3">
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Base64</p>
                {(!isOffChain && attestation.data) || (isOffChain && (decryptedDataBytes || offChainRawData)) ? (
                  <p className="font-mono text-xs text-black break-words">
                    {isOffChain
                      ? Buffer.from(decryptedDataBytes || offChainRawData!).toString('base64')
                      : attestation.data || '—'
                    }
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="h-4 animate-pulse bg-black/8"></div>
                    <div className="h-4 w-3/4 animate-pulse bg-black/8"></div>
                  </div>
                )}
              </div>
              <div>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Hexadecimal</p>
                {(!isOffChain && attestation.data) || (isOffChain && (decryptedDataBytes || offChainRawData)) ? (
                  <p className="font-mono text-xs text-black break-words">
                    {isOffChain && (decryptedDataBytes || offChainRawData)
                      ? Array.from(decryptedDataBytes || offChainRawData!)
                        .map(b => b.toString(16).padStart(2, '0'))
                        .join(' ')
                      : attestation.data
                        ? Buffer.from(attestation.data, 'base64')
                          .toString('hex')
                          .match(/.{1,2}/g)
                          ?.join(' ') || '—'
                        : '—'
                    }
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="h-4 animate-pulse bg-black/8"></div>
                    <div className="h-4 w-4/5 animate-pulse bg-black/8"></div>
                    <div className="h-4 w-2/3 animate-pulse bg-black/8"></div>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}
