'use client';

import React from "react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { Theme } from "@radix-ui/themes";
import '@mysten/dapp-kit/dist/index.css';

const networkConfig = {
  testnet: { url: getFullnodeUrl('testnet') },
  localnet: { url: "https://devnet.baku.movementlabs.xyz:443" },
};

const queryClient = new QueryClient();

export default function SuiProvider({ children }: { children: React.ReactNode }) {
  return (
      <Theme>
        <QueryClientProvider client={queryClient}>
          <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
            <WalletProvider autoConnect={true}>{children}</WalletProvider>
          </SuiClientProvider>
        </QueryClientProvider>
      </Theme>
  );
}