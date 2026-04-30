export const eventTicketNftAbi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "payable",
    inputs: [
      { name: "tierId", type: "uint8" },
      { name: "tokenURI_", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "useTicket",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "tokenIdToUsed",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getApproved",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "TicketMinted",
    inputs: [
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "tierId", type: "uint8" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TicketUsed",
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "usedBy", type: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FundsWithdrawn",
    inputs: [
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
    ],
    anonymous: false,
  },
] as const;

export const eventFactoryAbi = [
  {
    type: "function",
    name: "createEvent",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "config",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          {
            name: "tiers",
            type: "tuple[]",
            components: [
              { name: "price", type: "uint256" },
              { name: "maxSupply", type: "uint256" },
            ],
          },
          { name: "royaltyBps", type: "uint96" },
          { name: "maxPerWallet", type: "uint256" },
        ],
      },
    ],
    outputs: [{ name: "eventContract", type: "address" }],
  },
  {
    type: "function",
    name: "getEventsByOrganizer",
    stateMutability: "view",
    inputs: [{ name: "organizer", type: "address" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "getAllEvents",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "totalEvents",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "EventCreated",
    inputs: [
      { indexed: true, name: "organizer", type: "address" },
      { indexed: true, name: "eventContract", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: false, name: "symbol", type: "string" },
    ],
    anonymous: false,
  },
] as const;

export function mapLegacyTierNameToId(tierName: string): number {
  const value = tierName.trim().toUpperCase();
  if (value === "VIP") {
    return 1;
  }
  if (value === "VVIP") {
    return 2;
  }
  return 0;
}

export const TicketMarketplaceAbi = [
  {
    type: "function",
    name: "listTicket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "nft", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "buyTicket",
    stateMutability: "payable",
    inputs: [
      { name: "nft", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelListing",
    stateMutability: "nonpayable",
    inputs: [
      { name: "nft", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "updatePrice",
    stateMutability: "nonpayable",
    inputs: [
      { name: "nft", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "newPrice", type: "uint256" },
    ],
    outputs: [],
  },
] as const;
