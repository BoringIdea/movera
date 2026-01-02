'use client';

import {
  WalletProvider,
  Chain,
  DefaultChains,
} from "@suiet/wallet-kit";

const customChain: Chain = {
  id: "movement:sui",
  name: "Movement",
  rpcUrl: "https://devnet.baku.movementlabs.xyz/",
};

export default function WalletProviderWrapper({ children }: { children: React.ReactNode }) {
  return <WalletProvider
    chains={[...DefaultChains, customChain]}
  >
    {children}
  </WalletProvider>;
}