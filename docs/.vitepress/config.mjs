import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Movera',
  description: 'Movera - Decentralized attestation infrastructure for Sui and Aptos',
  
  // Base URL for deployment
  base: '/',
  
  // Theme configuration
  themeConfig: {
    // Logo
    logo: '/mas-logo.svg',
    
    // Navigation
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/Getting-Started/Quickstart' },
      { text: 'Docs', link: '/Basics/Core-Concepts' },
      { text: 'SDK', link: '/SDK' },
      { text: 'Contracts', link: '/Contracts' },
      { text: 'GitHub', link: 'https://github.com/BoringIdea/movera' }
    ],
    
    // Sidebar
    sidebar: {
      '/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Welcome', link: '/Welcome' },
            { text: 'Concepts', link: '/Concepts' },
            { text: 'Roadmap', link: '/Roadmap' }
          ]
        },
        {
          text: 'Getting Started',
          items: [
            { text: 'Quickstart', link: '/Getting-Started/Quickstart' }
          ]
        },
        {
          text: 'Basics',
          items: [
            { text: 'Core Concepts', link: '/Basics/Core-Concepts' },
            { text: 'Architecture', link: '/Basics/Architecture' },
            { text: 'Contracts', link: '/Basics/Contracts' }
          ]
        },
        {
          text: 'Resources',
          items: [
            { text: 'SDK Documentation', link: '/SDK' },
            { text: 'Contracts Documentation', link: '/Contracts' }
          ]
        }
      ]
    },
    
    // Social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/BoringIdea/movera' }
    ],
    
    // Search
    search: {
      provider: 'local'
    },
    
    // Footer
    footer: {
      message: 'Released under the Business Source License 1.1.',
      copyright: 'Copyright © 2025 Movera'
    },
    
    // Edit link
    editLink: {
      pattern: 'https://github.com/BoringIdea/movera/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  },
  
  // Markdown configuration
  markdown: {
    lineNumbers: true,
    config: (md) => {
      // Add plugins if needed
    }
  },
  
  // Ignore dead links during build (for external links and files outside docs directory)
  ignoreDeadLinks: true  // Ignore all dead links (includes external links and files outside docs directory)
})

