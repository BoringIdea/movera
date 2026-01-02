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
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <section className="border border-black bg-[#F4F7FF] px-6 py-5 space-y-3">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.3em] text-black/60">Schema Creation</p>
              <h1 className="text-3xl font-black">Create an Aptos schema</h1>
              <p className="text-sm font-bold text-black/60">Define attestations that run on {chain.toUpperCase()}.</p>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/40">{fields.length} field(s)</p>
            </div>
            <div className="text-right space-y-1 text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/40">
              <span>{network?.toUpperCase() ?? chain.toUpperCase()}</span>
              <span>{isRevocable ? 'Revocable' : 'Fixed'}</span>
            </div>
          </div>
        </section>

        <section className="border border-black bg-white px-5 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Schema Fields</p>
              <p className="text-xs font-bold text-black/50">Name fields, pick types, toggle vectors.</p>
            </div>
            <span className="text-[0.6rem] font-black uppercase tracking-[0.3em] text-black/40">Editable</span>
          </div>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={index} className="border border-black px-4 py-4 space-y-3">
                <div className="flex items-center justify-between text-[0.6rem] font-black uppercase tracking-[0.3em] text-black/50">
                  <span>Field #{index + 1}</span>
                  <span>{field.array ? 'Vector' : 'Scalar'}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Field Name</Label>
                    <Input
                      placeholder="Enter field name"
                      value={field.name}
                      onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                      className="w-full h-11 px-3 border border-black text-sm font-semibold tracking-[0.1em] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Field Type</Label>
                    <Select value={field.type} onValueChange={(value) => handleFieldChange(index, 'type', value)}>
                      <SelectTrigger className="border border-black text-sm font-semibold tracking-[0.1em] focus:outline-none">
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
                    <span className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-black/60">Array</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddField}
            className="w-full border border-black bg-[#D0E8FF] text-black font-black uppercase tracking-[0.3em] px-4 py-2"
          >
            + Add Field
          </button>
        </section>

        <section className="border border-black bg-white px-5 py-5 space-y-4">
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Schema Metadata</p>
            <p className="text-xs font-bold text-black/50">Describe the schema before publishing.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Name (Optional)</Label>
              <Input
                type="text"
                placeholder="Set the name of the schema"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-3 border border-black text-sm font-semibold tracking-[0.1em] focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">URL (Optional)</Label>
              <Input
                type="text"
                placeholder="Set the URL of the schema"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full h-12 px-3 border border-black text-sm font-semibold tracking-[0.1em] focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Description (Optional)</Label>
            <Input
              type="text"
              placeholder="Set the description of the schema"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-12 px-3 border border-black text-sm font-semibold uppercase tracking-[0.1em] focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Resolver Address (Optional)</Label>
            <Input
              type="text"
              placeholder="Optional smart contract address"
              value={resolver}
              onChange={(e) => setResolver(e.target.value)}
              className="w-full h-12 px-3 border border-black text-sm font-semibold uppercase tracking-[0.1em] focus:outline-none"
            />
          </div>
        </section>

        <section className="border border-black bg-[#F4F7FF] px-5 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="revocable"
                checked={isRevocable}
                onChange={() => setIsRevocable(!isRevocable)}
                className="w-4 h-4 border border-black"
              />
              <Label htmlFor="revocable" className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">
                Make schema revocable
              </Label>
            </div>
            <span className="text-[0.6rem] font-black uppercase tracking-[0.3em] text-black/50">Tx: {digest || 'Pending'}</span>
          </div>
          <div>
            <button
              type="button"
              onClick={() => handleMoveCall(fields, isRevocable)}
              disabled={!isFormValid() || isLoading || !connected}
              className="w-full md:w-auto border border-black bg-[#2792FF] text-white px-6 py-3 text-xs font-black uppercase tracking-[0.3em] disabled:opacity-50 disabled:cursor-not-allowed"
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
        <section className="max-w-6xl mx-auto px-4 py-5 space-y-3 border border-black bg-[#F4FFF9]">
          <div className="flex items-center justify-between text-[0.6rem] font-black uppercase tracking-[0.3em] text-black/50">
            <span>Schema published</span>
            <span>Digest</span>
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
              href="/schemas"
              className="border border-black px-4 py-2 text-xs font-black uppercase tracking-[0.3em]"
            >
              View all schemas
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
