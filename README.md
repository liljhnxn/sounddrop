# SoundDrop ⚡

> **Tagline:** *"Discover. Share. Repeat."*

A decentralized, permissionless music-discovery platform where users share songs they love and explore music recommendations from people around the world. Built on **Botchain Mainnet**.

---

## 🎯 Architecture & Strict Guarantees

- **Exactly One Webpage**: Single-page experience in Next.js App Router (`src/app/page.tsx`). No additional routes or pages.
- **Exactly One Solidity Smart Contract**: `contracts/SoundDrop.sol`.
- **Zero Backend & Zero Database**: 100% on-chain state stored directly on the Botchain blockchain and queried through Wagmi/Viem RPC.
- **No Tokens & No NFTs**: Focused purely on music curation and community discovery.
- **On-Chain Submissions & Likes**: All submissions, timestamps, like counts, and author removals live on-chain with event emissions.

---

## 🌐 Network Information: Botchain Mainnet

| Parameter | Value |
| :--- | :--- |
| **Network Name** | Botchain Mainnet |
| **Chain ID** | `677` |
| **RPC URL** | [https://rpc.botchain.ai](https://rpc.botchain.ai) |
| **Explorer** | [https://scan.botchain.ai](https://scan.botchain.ai) |
| **Native Token** | BOT (Total Supply: 150 Million) |
| **Contract Address** | `0xD1c202A518580a58F9fE4f9bC2C8F2cD8adFF9ad` |

---

## 🛠️ Tech Stack

- **Frontend Framework**: [Next.js 14 (App Router)](https://nextjs.org/) + [React 18](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Custom dark music-discovery theme: `#0B0B0D` background, `#18181B` cards, `#DFFF00` electric lime accent)
- **Web3 Layer**: [wagmi v2](https://wagmi.sh/), [viem](https://viem.sh/), and MetaMask (Injected connector)
- **Smart Contract & Tooling**: [Solidity 0.8.20](https://soliditylang.org/), [Hardhat](https://hardhat.org/)

---

## 📜 Smart Contract: `SoundDrop.sol`

The smart contract implements all the core platform mechanics:

1. **`submitSong(title, artist, platform, url, description)`**:
   Stores title, artist, platform (`Spotify`, `YouTube`, `SoundCloud`, `Apple Music`, etc.), direct URL, and an optional recommendation note. Sets author to `msg.sender`, records `block.timestamp`, and emits `SongSubmitted`.
2. **`likeSong(songId)`**:
   Increments the song's like count and global likes. Strictly prevents duplicate likes from the same wallet via mapping check (`hasLiked[songId][msg.sender]`). Emits `SongLiked`.
3. **`unlikeSong(songId)`**:
   Decrements the song's like count and platform likes, resetting the wallet's like status. Emits `SongUnliked`.
4. **`removeSong(songId)`**:
   Allows only the author of the submission (`require(msg.sender == song.author)`) to deactivate their track, updating active counters and emitting `SongRemoved`.
5. **`getAllSongs()` & `getActiveSongs()`**:
   View functions to fetch all submissions or only active tracks.
6. **`batchHasLiked(songIds, user)`**:
   High-performance multicall helper returning a boolean array of like states for the connected wallet in a single RPC query.
7. **`getStats()`**:
   Returns `(totalSubmissions, activeSubmissions, totalLikes)`.

---

## 🎨 Design System

- **Background**: Deep black (`#0B0B0D`)
- **Cards**: Modern charcoal (`#18181B`) with subtle borders (`#27272A`)
- **Primary Accent**: Electric lime (`#DFFF00`) with glowing highlights
- **Text**: Crisp white (`#FFFFFF`) and zinc secondary text (`#A1A1AA`)
- **Components**: Equalizer animations, platform badges, horizontal card layout, live stats counters.

---

## 🚀 Getting Started

### 1. Installation

```bash
npm install
```

### 2. Environment Variables

Copy the example file:
```bash
cp .env.example .env.local
```

Fill in your configuration:
```env
BOTCHAIN_RPC_URL="https://rpc.bohr.life"
PRIVATE_KEY="your_private_key_for_deployment"
NEXT_PUBLIC_SOUND_DROP_CONTRACT_ADDRESS="0x..."
```

### 3. Compile & Test Smart Contract

```bash
# Compile the Solidity contract
npm run compile

# Run the comprehensive test suite
npm run test
```

### 4. Deploy to Botchain Testnet

Ensure your deployer account has some testnet BOHR:
```bash
npm run deploy:botchain
```

The script will automatically write the deployed address to `src/config/deployedAddress.json`. Update `NEXT_PUBLIC_SOUND_DROP_CONTRACT_ADDRESS` in `.env.local` with this address.

### 5. Run the Frontend

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Smart Contract Test Coverage

The test suite in `test/SoundDrop.test.js` verifies:
- ✅ Submitting songs with valid metadata and emitting `SongSubmitted`
- ✅ Reverting submissions with empty required fields
- ✅ Liking songs and incrementing like counts and global likes
- ✅ Preventing duplicate likes from the same wallet address
- ✅ Unliking songs and decrementing like counts
- ✅ Reverting unliking for songs not previously liked
- ✅ Deleting/removing submissions by author only
- ✅ Reverting unauthorized removals
- ✅ Accurate platform statistics (`getStats`)
- ✅ Batch like status retrieval (`batchHasLiked`)

---

## 📄 License

MIT © SoundDrop Team

