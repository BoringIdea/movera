import { SWRProvider } from '@/components/providers/swr-provider';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@suiet/wallet-kit/style.css';
import '@radix-ui/themes/styles.css';
import WalletProvider from '../components/providers/wallet-provider';
import { ChainProvider } from '../components/providers/chain-provider';
import { PageTransition } from '../components/ui/page-transition';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Movera | The Trust Layer for Move",
  description: "Movera is the premier attestation and reputation platform for the Move ecosystem, powered by the MoveAS protocol.",
  icons: {
    icon: "/mas.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/mas.png" type="image/png" />
      </head>
      <body className={inter.className}>
        <ChainProvider>
          <WalletProvider>
            <SWRProvider>
              <PageTransition />
              {children}
            </SWRProvider>
          </WalletProvider>
        </ChainProvider>
      </body>
    </html>
  );
}