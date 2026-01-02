import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const docsDir = join(__dirname, '..')
const rootDir = join(docsDir, '..')

// Files to copy
const filesToCopy = [
  {
    from: join(rootDir, 'packages/sdk/README.md'),
    to: join(docsDir, 'SDK.md')
  },
  {
    from: join(rootDir, 'packages/contracts/README.md'),
    to: join(docsDir, 'Contracts.md')
  }
]

// Copy files
filesToCopy.forEach(({ from, to }) => {
  try {
    if (!existsSync(from)) {
      console.warn(`⚠️  Source file not found: ${from}`)
      return
    }

    // Ensure target directory exists
    const targetDir = dirname(to)
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true })
    }

    copyFileSync(from, to)
    console.log(`✅ Copied: ${from} -> ${to}`)
  } catch (error) {
    console.error(`❌ Failed to copy ${from} to ${to}:`, error.message)
    process.exit(1)
  }
})

console.log('📋 README files copied successfully!')

