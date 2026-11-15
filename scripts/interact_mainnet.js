require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  const rpcUrl = process.env.BOTCHAIN_RPC_URL || 'https://rpc.botchain.ai';
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const contractAddress = process.env.NEXT_PUBLIC_SOUND_DROP_CONTRACT_ADDRESS || '0xD1c202A518580a58F9fE4f9bC2C8F2cD8adFF9ad';
  const artifactPath = path.join(__dirname, '../artifacts/contracts/SoundDrop.sol/SoundDrop.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const pk1 = process.env.PRIVATE_KEY;
  const pk2 = process.env.PRIVATE_KEY_2;
  const pk3 = process.env.PRIVATE_KEY_3;

  if (!pk1 || !pk2 || !pk3) {
    throw new Error('Please configure PRIVATE_KEY, PRIVATE_KEY_2, and PRIVATE_KEY_3 in .env');
  }

  const wallet1 = new ethers.Wallet(pk1, provider);
  const wallet2 = new ethers.Wallet(pk2, provider);
  const wallet3 = new ethers.Wallet(pk3, provider);

  const contract1 = new ethers.Contract(contractAddress, artifact.abi, wallet1);
  const contract2 = new ethers.Contract(contractAddress, artifact.abi, wallet2);
  const contract3 = new ethers.Contract(contractAddress, artifact.abi, wallet3);

  console.log('=== Checking Balances ===');
  const b1 = await provider.getBalance(wallet1.address);
  const b2 = await provider.getBalance(wallet2.address);
  const b3 = await provider.getBalance(wallet3.address);
  console.log(`Wallet 1 (${wallet1.address}): ${ethers.formatEther(b1)} BOT`);
  console.log(`Wallet 2 (${wallet2.address}): ${ethers.formatEther(b2)} BOT`);
  console.log(`Wallet 3 (${wallet3.address}): ${ethers.formatEther(b3)} BOT`);

  const initialSongs = await contract1.totalSubmissions();
  console.log(`Initial total submissions: ${initialSongs.toString()}`);

  const results = [];
  const gasPrice = ethers.parseUnits('20', 'gwei');

  // Interaction 1: Wallet 3 submits Song #1
  console.log('\n--- Interaction 1 (Wallet 3): submitSong #1 ---');
  const tx1 = await contract3.submitSong(
    'Midnight City',
    'M83',
    'Spotify',
    'https://open.spotify.com/track/1eyzqe2QqGZUmfcPZtrIyt',
    'Iconic synth-pop anthem with memorable saxophone solo outro.',
    { gasPrice, gasLimit: 400000 }
  );
  console.log(`Tx1 sent: ${tx1.hash}`);
  const receipt1 = await tx1.wait();
  console.log(`Tx1 confirmed in block ${receipt1.blockNumber} (Gas used: ${receipt1.gasUsed.toString()})`);
  const songId1 = (await contract3.totalSubmissions()).toString();
  results.push({
    interaction: 1,
    action: 'submitSong',
    wallet: wallet3.address,
    txHash: tx1.hash,
    blockNumber: receipt1.blockNumber,
    gasUsed: receipt1.gasUsed.toString(),
    details: `Song #${songId1}: Midnight City by M83`
  });

  // Interaction 2: Wallet 1 likes Song #1
  console.log('\n--- Interaction 2 (Wallet 1): likeSong #1 ---');
  const tx2 = await contract1.likeSong(songId1, { gasPrice, gasLimit: 400000 });
  console.log(`Tx2 sent: ${tx2.hash}`);
  const receipt2 = await tx2.wait();
  console.log(`Tx2 confirmed in block ${receipt2.blockNumber} (Gas used: ${receipt2.gasUsed.toString()})`);
  results.push({
    interaction: 2,
    action: 'likeSong',
    wallet: wallet1.address,
    txHash: tx2.hash,
    blockNumber: receipt2.blockNumber,
    gasUsed: receipt2.gasUsed.toString(),
    details: `Liked Song #${songId1}`
  });

  // Interaction 3: Wallet 2 likes Song #1
  console.log('\n--- Interaction 3 (Wallet 2): likeSong #1 ---');
  const tx3 = await contract2.likeSong(songId1, { gasPrice, gasLimit: 400000 });
  console.log(`Tx3 sent: ${tx3.hash}`);
  const receipt3 = await tx3.wait();
  console.log(`Tx3 confirmed in block ${receipt3.blockNumber} (Gas used: ${receipt3.gasUsed.toString()})`);
  results.push({
    interaction: 3,
    action: 'likeSong',
    wallet: wallet2.address,
    txHash: tx3.hash,
    blockNumber: receipt3.blockNumber,
    gasUsed: receipt3.gasUsed.toString(),
    details: `Liked Song #${songId1}`
  });

  // Interaction 4: Wallet 3 submits Song #2
  console.log('\n--- Interaction 4 (Wallet 3): submitSong #2 ---');
  const tx4 = await contract3.submitSong(
    'Starboy',
    'The Weeknd ft. Daft Punk',
    'Apple Music',
    'https://music.apple.com/us/album/starboy/1440871441',
    'Electropop and R&B collaboration with signature Daft Punk bassline.',
    { gasPrice, gasLimit: 400000 }
  );
  console.log(`Tx4 sent: ${tx4.hash}`);
  const receipt4 = await tx4.wait();
  console.log(`Tx4 confirmed in block ${receipt4.blockNumber} (Gas used: ${receipt4.gasUsed.toString()})`);
  const songId2 = (await contract3.totalSubmissions()).toString();
  results.push({
    interaction: 4,
    action: 'submitSong',
    wallet: wallet3.address,
    txHash: tx4.hash,
    blockNumber: receipt4.blockNumber,
    gasUsed: receipt4.gasUsed.toString(),
    details: `Song #${songId2}: Starboy by The Weeknd`
  });

  // Interaction 5: Wallet 1 likes Song #2
  console.log('\n--- Interaction 5 (Wallet 1): likeSong #2 ---');
  const tx5 = await contract1.likeSong(songId2, { gasPrice, gasLimit: 400000 });
  console.log(`Tx5 sent: ${tx5.hash}`);
  const receipt5 = await tx5.wait();
  console.log(`Tx5 confirmed in block ${receipt5.blockNumber} (Gas used: ${receipt5.gasUsed.toString()})`);
  results.push({
    interaction: 5,
    action: 'likeSong',
    wallet: wallet1.address,
    txHash: tx5.hash,
    blockNumber: receipt5.blockNumber,
    gasUsed: receipt5.gasUsed.toString(),
    details: `Liked Song #${songId2}`
  });

  console.log('\n=== Summary of Interactions ===');
  console.log(JSON.stringify(results, null, 2));

  const stats = await contract1.getStats();
  console.log('\n=== Final SoundDrop Stats ===');
  console.log(`Total Submissions: ${stats[0].toString()}`);
  console.log(`Active Submissions: ${stats[1].toString()}`);
  console.log(`Total Likes: ${stats[2].toString()}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
