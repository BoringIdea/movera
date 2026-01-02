import dotenv from 'dotenv';

dotenv.config();

const NEXT_PUBLIC_NETWORK = process.env.NEXT_PUBLIC_NETWORK;
console.log('Network: ', NEXT_PUBLIC_NETWORK);

export type ChainConfig = {
  name: string;
  chain: string;
  icon: string;
  isTestnet?: boolean;
}

const chains: ChainConfig[] = [
  { 
    name: "Sui Testnet", 
    chain: "sui",
    icon: "/sui-logo.svg", 
  },
  {
    name: "Aptos Testnet",
    chain: "aptos",
    icon: "/aptos-logo.svg",
  },
  // { 
  //   name: "Movement Testnet", 
  //   chain: "movement",
  //   icon: "/movement-logo.svg", 
  // },
]

export function getNetwork() {
  return NEXT_PUBLIC_NETWORK || 'testnet';
}

export function getChains(): ChainConfig[] {
  return chains;
}

// export function getChain(network: string): string {
//   return networks.find(n => n.alias === network)?.chain || '';
// }

export function getEndpoint(chain: string): string {
  if (getNetwork() === "testnet") {
    switch (chain) {
      case 'sui':
        return 'https://fullnode.testnet.sui.io:443';
      case 'movement':
        return 'https://aptos.testnet.porto.movementlabs.xyz/v1';
      case 'aptos':
        return 'https://fullnode.testnet.aptos.dev';
      default:
        throw new Error('Invalid chain');
    }
  } else {
    throw new Error('Invalid network');    
  }
}

export function getExplorerUrl(chain: string){
  if (getNetwork() === "testnet") {
    switch (chain) {
      case 'sui':
        return 'https://suiscan.xyz/testnet';
      case 'movement':
        return 'https://explorer.movementnetwork.xyz';
      case 'aptos':
        return 'https://explorer.aptoslabs.com';
      default:
        throw new Error('Invalid chain');
    }
  } else {
    throw new Error('Invalid network');    
  }
  // switch (network) {
  //   case 'mainnet':
  //     return 'https://suiscan.xyz/mainnet';
  //   case 'testnet':
  //     return 'https://suiscan.xyz/testnet';
  //   case 'movement':
  //     return 'https://explorer.devnet.baku.movementlabs.xyz';
  //   case 'aptos':
  //     return 'https://explorer.aptoslabs.com/';
  //   default:
  //     throw new Error('Invalid network');
  // }
}

export function getExplorerTxUrl(chain: string){
  if (getNetwork() === "testnet") {
    switch (chain) {
      case 'sui':
        return 'https://suiscan.xyz/testnet/tx';
      case 'movement':
        return 'https://explorer.movementnetwork.xyz/txblock';
      case 'aptos':
        return 'https://explorer.aptoslabs.com/txn';
      default:
        throw new Error('Invalid chain');
    }
  } else {
    throw new Error('Invalid network');    
  }
  // switch (network) {
  //   case 'mainnet':
  //     return 'https://suiscan.xyz/mainnet/tx';
  //   case 'testnet':
  //     return 'https://suiscan.xyz/testnet/tx';
  //   case 'movement':
  //     return 'https://explorer.devnet.baku.movementlabs.xyz/txblock';
  //   case 'aptos':
  //     return 'https://explorer.aptoslabs.com/txn';
  //   default:
  //     throw new Error('Invalid network');
  // }
}