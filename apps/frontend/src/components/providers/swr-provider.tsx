'use client';

import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig 
      value={{ 
        revalidateOnFocus: false,
        revalidateOnMount: true,
        dedupingInterval: 2000,
        refreshInterval: 10000
      }}
    >
      {children}
    </SWRConfig>
  );
}