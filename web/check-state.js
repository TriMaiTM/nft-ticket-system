require('dotenv').config({ path: '.env.local' });
const { createPublicClient, http } = require('viem');
const { hardhat } = require('viem/chains');
const fs = require('fs');

const abi = JSON.parse(fs.readFileSync('d:/HK8/TicketNFT/contracts/artifacts/contracts/TicketMarketplace.sol/TicketMarketplace.json')).abi;
const publicClient = createPublicClient({ chain: hardhat, transport: http() });

async function main() {
  const logs = await publicClient.getLogs({
    address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    event: abi.find(a => a.name === 'TicketListed'),
    fromBlock: 'earliest'
  });
  console.log('TicketListed Events:', logs.map(l => l.args));
}
main().catch(console.error);
