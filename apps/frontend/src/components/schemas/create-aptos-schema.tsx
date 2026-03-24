"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Transaction } from "@mysten/sui/transactions";
import { getPackageAddress } from "@movera/sdk"
import { Header } from "@/components/header"
import { bcs } from "@mysten/bcs"
import { getNetwork, getExplorerTxUrl } from "@/utils"
import { AlertDialog, Flex } from "@radix-ui/themes"
import { Loader2 } from "lucide-react"
import { useChain, Chain } from "@/components/providers/chain-provider";
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import Link from "next/link"

interface Field {
  name: string;
  type: string;
  array: boolean;
}

const network = getNetwork() || 'testnet';
const config = new AptosConfig({ network: network as Network });
const aptos = new Aptos(config);

export function CreateAptosSchema({ chain }: { chain: Chain }) {
  const { connected, account, signAndSubmitTransaction } = useWallet();
  const [digest, setDigest] = useState('');
  const [fields, setFields] = useState<Field[]>([{ name: "", type: "", array: false }])

  const [isRevocable, setIsRevocable] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")
  const [resolver, setResolver] = useState("")

  useEffect(() => {
    if (!connected) return;
  }, [connected])

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

    if (!connected) {
      return Error('Please connect wallet')
    }
    const packageId = getPackageAddress(chain, network as any);
    const tx = new Transaction();

    console.log('current network', network)
    console.log('packageId', packageId)
    console.log('schemaBytes', schemaBytes)

    const response = await signAndSubmitTransaction({
      sender: account?.address,
      data: {
        function: `${packageId}::aas::create_schema`,
        functionArguments: [
          schemaBytes,
          name,
          description,
          url,
          false,
          resolver || "0x0",
        ]
      }
    })
    console.log('executed transaction', response);
    setDigest(response.hash);
    try {
      await aptos.waitForTransaction({ transactionHash: response.hash });
      setAlertMessage(`Transaction submitted successfully!\n\nTransaction hash: ${response.hash}`);
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
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <Header />
      <main className="mv-frame space-y-6 py-8">
        <section className="mv-panel-muted space-y-3 px-6 py-5">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-2">
              <p className="mv-kicker">Schema Creation</p>
              <h1 className="mv-title text-3xl md:text-4xl">Create an Aptos schema</h1>
              <p className="mv-copy">Define attestations that run on {chain.toUpperCase()}.</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">{fields.length} field(s)</p>
            </div>
            <div className="text-right space-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">
              <span>{network?.toUpperCase() ?? chain.toUpperCase()}</span>
              <span>{isRevocable ? 'Revocable' : 'Fixed'}</span>
            </div>
          </div>
        </section>

        <section className="mv-panel space-y-4 px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="mv-kicker">Schema Fields</p>
              <p className="text-xs text-black/50">Name fields, pick types, toggle vectors.</p>
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
            className="w-full border border-black/10 bg-[rgba(245,249,255,0.92)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-black"
          >
            + Add Field
          </button>
        </section>

        <section className="mv-panel space-y-4 px-5 py-5">
          <div>
            <p className="mv-kicker">Schema Metadata</p>
            <p className="text-xs text-black/50">Describe the schema before publishing.</p>
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
          <div className="space-y-1">
            <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">Description (Optional)</Label>
            <Input
              type="text"
              placeholder="Set the description of the schema"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mv-input h-12 w-full px-3 text-sm uppercase tracking-[0.08em]"
            />
          </div>
          <div className="space-y-1">
            <Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">Resolver Address (Optional)</Label>
            <Input
              type="text"
              placeholder="Optional smart contract address"
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
              disabled={!isFormValid() || isLoading || !connected}
              className="mv-btn-primary w-full md:w-auto disabled:cursor-not-allowed disabled:opacity-50"
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
          <p className="break-all text-sm text-black">{digest}</p>
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
        <AlertDialog.Content className="mx-auto max-w-md border border-black/10 bg-white px-6 py-5">
          <AlertDialog.Title className="mv-heading mb-2 text-lg">
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
