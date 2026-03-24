"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useCurrentWallet, useSignAndExecuteTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from "@mysten/sui/transactions";
import { getSchemaRegistryId, getPackageId, Network } from "@movera/sdk"
import { Header } from "@/components/header"
import { bcs } from "@mysten/bcs"
import { getNetwork, getExplorerTxUrl } from "@/utils"
import { AlertDialog, Flex } from "@radix-ui/themes"
import { Loader2 } from "lucide-react"
import { useChain, Chain } from "@/components/providers/chain-provider";

interface Field {
  name: string;
  type: string;
  array: boolean;
}

export function CreateSuiSchema({ chain }: { chain: Chain }) {
  const network = getNetwork();

  const { isConnected, currentWallet, connectionStatus } = useCurrentWallet();
  const currentAccount = useCurrentAccount();

  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [digest, setDigest] = useState('');
  const [fields, setFields] = useState<Field[]>([{ name: "", type: "", array: false }])

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")
  const [isRevocable, setIsRevocable] = useState(false)
  const [resolver, setResolver] = useState("")

  useEffect(() => {
    if (!isConnected) return;
  }, [isConnected])

  const handleAddField = () => {
    setFields([...fields, { name: "", type: "", array: false }])
  }
  const handleFieldChange = (index: number, field: keyof Field, value: string | boolean) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], [field]: value }
    setFields(newFields)
  }
  const isFormValid = () => {
    return fields.some((field) => field.name && field.type)
  }

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleMoveCall(fields: Field[], revokable: boolean) {
    setIsLoading(true);
    const schemaString = fields.map(field => {
      let typeString = field.type;
      if (field.array) {
        typeString = `Vector<${field.type}>`;
      }
      return `${field.name}: ${typeString}`;
    }).join(', ');

    const schemaBytes = bcs.string().serialize(schemaString).toBytes();

    if (!isConnected || !currentWallet || !currentAccount) {
      return Error('Please connect wallet')
    }

    const schemaRegistryId = getSchemaRegistryId(chain, network as Network);
    const packageId = getPackageId(chain, network as Network);
    const tx = new Transaction();

    console.log('current network', network)
    console.log('packageId', packageId)
    console.log('schemaRegistryID', schemaRegistryId)

    if (resolver) {
      console.log('create schema with resolver', resolver)
      const [resolverBuilder, adminCap, schemaRecord] = tx.moveCall({
        target: `${packageId}::schema::new_with_resolver`,
        arguments: [
          tx.object(schemaRegistryId),
          tx.pure.vector('u8', schemaBytes),
          tx.pure.string(name),
          tx.pure.string(description),
          tx.pure.string(url),
          tx.pure.bool(revokable)
        ],
      });

      tx.transferObjects([adminCap], currentAccount.address);

      tx.moveCall({
        target: `${resolver}::add`,
        arguments: [
          schemaRecord,
          resolverBuilder,
        ],
      });

      tx.moveCall({
        target: `${packageId}::schema::add_resolver`,
        arguments: [
          schemaRecord,
          resolverBuilder,
        ],
      });

      tx.moveCall({
        target: `${packageId}::schema::share_schema`,
        arguments: [
          schemaRecord,
        ],
      });
    } else {
      console.log('create schema without resolver')
      const adminCap = tx.moveCall({
        target: `${packageId}::schema::new`,
        arguments: [
          tx.object(schemaRegistryId),
          tx.pure.vector('u8', schemaBytes),
          tx.pure.string(name || ""),
          tx.pure.string(description || ""),
          tx.pure.string(url || ""),
          tx.pure.bool(revokable)
        ],
      });

      tx.transferObjects([adminCap], currentAccount.address);
    }

    try {
      signAndExecuteTransaction({
        transaction: tx as any,
      }, {
        onSuccess: async (result) => {
          console.log('executed transaction', result);
          setDigest(result.digest);
          const txUrl = `${getExplorerTxUrl(chain)}/${result.digest}`;
          setAlertMessage(`Transaction submitted successfully!\n\nTransaction hash: ${result.digest}`);
          setIsAlertOpen(true);
          setIsLoading(false);

          // refetch schemas and attestations
          // await mutateSchemas();
          // await mutateAttestations();
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
  }

  return (
    <div className="mv-shell">
      <Header />
      <main className="mv-frame space-y-6 py-8">
        <section className="mv-panel-muted space-y-3 px-6 py-5">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-2">
              <p className="mv-kicker">Schema Creation</p>
              <h1 className="mv-title text-3xl md:text-4xl">Define your attestation schema</h1>
              <p className="mv-copy">Publish a reusable schema on {chain.toUpperCase()}.</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">{fields.length} field(s) defined</p>
            </div>
            <div className="text-right space-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">
              <span>{network?.toUpperCase() ?? chain.toUpperCase()}</span>
              <span>{isRevocable ? 'Revocable' : 'Non-revocable'}</span>
            </div>
          </div>
        </section>

        <section className="mv-panel space-y-4 px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="mv-kicker">Schema Fields</p>
              <p className="text-xs text-black/50">Name each field and select its type.</p>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">Editable</span>
          </div>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={index} className="space-y-3 border border-black/10 bg-white/72 px-4 py-4">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-black/50">
                  <span>Field #{index + 1}</span>
                  <span>{field.array ? 'Vector' : 'Scalar'}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">Field Name</Label>
                    <Input
                      placeholder="Enter field name"
                      value={field.name}
                      onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                      className="mv-input h-11 w-full px-3 text-sm tracking-[0.08em]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">Field Type</Label>
                    <Select value={field.type} onValueChange={(value) => handleFieldChange(index, 'type', value)}>
                      <SelectTrigger className="mv-input text-sm tracking-[0.08em]">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {['u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'bool', 'string', 'address'].map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={field.array}
                      onCheckedChange={(checked) => handleFieldChange(index, 'array', Boolean(checked))}
                      className="border border-black rounded-none"
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">Array</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddField}
            className="w-full border border-black/10 bg-[rgba(245,249,255,0.92)] font-mono text-[10px] uppercase tracking-[0.16em] text-black px-4 py-2"
          >
            + Add Field
          </button>
        </section>

        <section className="mv-panel space-y-4 px-5 py-5">
          <div>
            <p className="mv-kicker">Schema Metadata</p>
            <p className="text-xs text-black/50">Provide supplementary details for your schema.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">Name (Optional)</Label>
              <Input
                type="text"
                placeholder="Set the name of the schema"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mv-input h-12 w-full px-3 text-sm tracking-[0.08em]"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">URL (Optional)</Label>
              <Input
                type="text"
                placeholder="Set the URL of the schema"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mv-input h-12 w-full px-3 text-sm tracking-[0.08em]"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">Description (Optional)</Label>
              <Input
                type="text"
                placeholder="Set the description of the schema"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mv-input h-12 w-full px-3 text-sm tracking-[0.08em]"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">Resolver Address (Optional)</Label>
            <Input
              type="text"
              placeholder="Optional smart contract executed per attestation"
              value={resolver}
              onChange={(e) => setResolver(e.target.value)}
              className="mv-input h-12 w-full px-3 text-sm uppercase tracking-[0.08em]"
            />
          </div>
        </section>

        <section className="mv-panel-muted space-y-4 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="revocable"
                checked={isRevocable}
                onChange={() => setIsRevocable(!isRevocable)}
                className="w-4 h-4 border border-black"
              />
              <Label htmlFor="revocable" className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">
                Make schema revocable
              </Label>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/50">Tx: {digest || 'Pending'}</span>
          </div>
          <div>
            <button
              type="button"
              onClick={() => handleMoveCall(fields, isRevocable)}
              disabled={!isFormValid() || isLoading || !isConnected}
              className="mv-btn-primary w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Schema'
              )}
            </button>
          </div>
        </section>
      </main>

      {digest && (
        <section className="mv-frame space-y-3 border border-black/10 bg-[rgba(245,249,255,0.92)] px-4 py-5">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-black/50">
            <span>Schema published</span>
            <span>Digest</span>
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
              href="/schemas"
              className="mv-btn-secondary px-4 py-2"
            >
              View all schemas
            </Link>
          </div>
        </section>
      )}

      <AlertDialog.Root open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialog.Content className="bg-white border border-black/10 px-6 py-5 max-w-md mx-auto">
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
