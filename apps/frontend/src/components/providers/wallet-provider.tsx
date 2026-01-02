'use client';

import React from "react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from "@radix-ui/themes";
import AptosProvider from "./aptos-provider";
import SuiProvider from "./sui-provider";

const queryClient = new QueryClient();

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
      <Theme>
        <QueryClientProvider client={queryClient}>
          <SuiProvider>
            <AptosProvider>
              {children}
            </AptosProvider>
          </SuiProvider>
        </QueryClientProvider>
      </Theme>
  );
}