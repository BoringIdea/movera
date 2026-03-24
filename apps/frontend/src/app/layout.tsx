import { SWRProvider } from '@/components/providers/swr-provider';
import type { Metadata } from "next";
import { IBM_Plex_Mono, Public_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import '@suiet/wallet-kit/style.css';
import '@radix-ui/themes/styles.css';
import WalletProvider from '../components/providers/wallet-provider';
import { ChainProvider } from '../components/providers/chain-provider';
import { PageTransition } from '../components/ui/page-transition';

const display = Source_Serif_4({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-display" });
const sans = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

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
      <body className={`${display.variable} ${sans.variable} ${mono.variable}`}>
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
