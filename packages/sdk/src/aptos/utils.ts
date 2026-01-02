import { PACKAGES } from "../constants";

type Network = 'mainnet' | 'testnet' | 'devnet' | 'localnet' | 'custom'

export function getPackageAddress(chain: string, network: Network): string {
  if (chain === 'aptos') {
    switch (network) {
      case 'mainnet':
        return PACKAGES.aptos.network.mainnet.PackageAddress;
      case 'testnet':
        return PACKAGES.aptos.network.testnet.PackageAddress;
      case 'devnet':
        return PACKAGES.aptos.network.devnet.PackageAddress;
      default:
        throw new Error('Invalid network');
    }
  } else {
    switch (network) {
      case 'mainnet':
        return PACKAGES.movement.network.mainnet.PackageAddress;
      case 'testnet':
        return PACKAGES.movement.network.testnet.PackageAddress;
      case 'devnet':
        return PACKAGES.movement.network.devnet.PackageAddress;
      case 'custom':
        return PACKAGES.movement.network.testnet.PackageAddress;
      default:
        throw new Error('Invalid network');
    }
  } 
}