// Default Seal key server IDs for each network
// These are Mysten Labs' default testnet key servers (Open mode, freely available)
// For mainnet, users should use their own key servers or contact verified providers
export const SEAL_KEY_SERVERS = {
  testnet: [
    '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', // mysten-testnet-1
    '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8', // mysten-testnet-2
  ],
  mainnet: [
    // Mainnet key servers should be configured by users
    // See: https://seal-docs.wal.app/Pricing/
  ],
  devnet: [
    // Devnet key servers should be configured by users
  ],
};

export const PACKAGES = {
  sui: {
    network: {
      mainnet: {
        PackageID: '',
        SchemaRegistryID: '',
        AttestationRegistryID: '',
      },
      testnet: {
        PackageID: '0x25e7e1b5ea4b6e83b531c9fdd6f153b3d6f01bc63dbb6c371fa783ad4feaff17',
        SchemaRegistryID: '0x0310e993a6f0802257394b5a60732f23596a33d09ea8d288369549895fc2ebe2',
        AttestationRegistryID: '0xf9d37981cf92c4fa71f40ff5139ff828dc989b096e123ff6f3f696679ebb812d',
      },
      devnet: {
        PackageID: '',
        SchemaRegistryID: '',
        AttestationRegistryID: '',
      },
    }
  },
  movement: {
    network: {
      mainnet: {
        PackageAddress: ''
      },
      testnet: {
        PackageAddress: '0xf4c5c2dfc535845752cf78d38a422eb018bd93ea30c0b1841e392da3c87e2be3',
        ResolverPackageAddress: '',
      },
      devnet: {
        PackageAddress: ''
      }
    }
  },
  aptos: {
    network: {
      mainnet: {
        PackageAddress: ''
      },
      testnet: {
        PackageAddress: '0xa6ba1e444bea4a3dd0dcf4fd51ee9eb287fe00ee9228ee06364a83f555176bb4',
        ResolverPackageAddress: '0x0f6e0bf40111bc7efe17b4b249e09474bc3e25c9d2f2ce7524379d1d5c294ac6',
      },
      devnet: {
        PackageAddress: ''
      }
    }
  }
}