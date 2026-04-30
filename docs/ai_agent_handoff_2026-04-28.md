# TicketNFT AI Agent Handoff

## 1. Project Overview
This project is an NFT-based event ticketing platform where organizers create event drafts off-chain, publish events on-chain through a factory contract, and users buy event tickets as NFTs.

Core product intent:
- Organizer creates and manages events.
- Event publish must create a dedicated NFT contract per event.
- User buys ticket on-chain first, then the app records the purchase in Supabase using the real `txHash` and `tokenId`.
- Long-term roadmap includes secondary marketplace, QR check-in, organizer analytics, and mainnet hardening.

## 2. Tech Stack
- Frontend: Next.js 16.2.4 App Router, React 19, TypeScript, Tailwind/CSS
- Web3 client: Wagmi v2, Viem v2, RainbowKit v2, TanStack Query
- Backend/API: Next.js Route Handlers
- Database: Supabase Postgres with Prisma 6
- Smart contracts: Solidity 0.8.24, Hardhat, OpenZeppelin v5
- Target chain: Polygon Amoy testnet

## 3. Non-Negotiable Architecture Rules
- Wallet auth is nonce/signature based. Session is established server-side after signature verification.
- Roles are stored in DB, not in `.env`.
  - `USER`
  - `ORGANIZER`
  - `ADMIN`
- Draft events are off-chain and must remain hidden from normal users.
- Published events must have a real on-chain contract address.
- Strict on-chain enforcement for ticket purchases:
  - frontend executes on-chain mint first
  - waits for receipt
  - extracts `txHash` and `tokenId`
  - only then calls backend API to create `Order` and `Ticket` in DB
- Do not create fake ticket DB records before on-chain success.

## 4. Current Data Model Notes
- `User.role` controls permissions.
- `Event.status` distinguishes `DRAFT` vs `PUBLISHED`.
- `TicketTier` is the source of off-chain tier metadata and pricing.
- `Ticket` stores the purchased NFT record.
- `TicketTier.onchainTierId` was added during the multi-tier upgrade to map DB tiers to contract tier IDs.

## 5. What Was Already Completed Before This Handoff
- Monorepo structure with `contracts/` and `web/`
- Wallet connection and wallet-signature auth
- Session-backed auth endpoints
- Organizer workspace
- Draft event creation flow
- Public event list and event detail UI
- Basic on-chain buy flow for v1 single-price tickets
- EventFactory + EventTicketNFT baseline contracts
- Prisma + Supabase setup

## 6. What Was Completed In This Multi-Tier Upgrade

### Smart Contracts
- `contracts/contracts/EventTicketNFT.sol`
  - upgraded from single `ticketPrice` to multi-tier config
  - each tier now has:
    - `price`
    - `maxSupply`
    - `minted`
    - `exists`
  - contract now mints by `tierId`
  - emits `TicketMinted(to, tokenId, tierId)`
- `contracts/contracts/EventFactory.sol`
  - upgraded `createEvent` to accept tier arrays
  - deploys event contracts with full tier configuration
- `contracts/test/EventFactory.test.ts`
  - updated tests for tier config, tier sellout, and minting behavior

### Backend / Database
- `web/prisma/schema.prisma`
  - added `TicketTier.onchainTierId`
- `/api/organizer/events`
  - now accepts multiple tiers, not just one tier
- `/api/events/[id]/go-live`
  - now stores `contractAddress`
  - maps draft tier IDs to on-chain tier IDs during publish
- `/api/tickets/buy`
  - now expects real `txHash`, `tokenId`, and minted `onchainTierId`
  - validates tier mapping for upgraded events
  - still preserves compatibility for legacy events that do not yet have `onchainTierId`

### Frontend
- `web/components/organizer/publish-event-button.tsx`
  - removed old restriction blocking multi-tier publish
  - sends full tier array to factory
  - added fallback logic to recover contract address if event log parsing fails
  - added custom fee logic for Amoy because default gas tip was too low
- `web/components/tickets/buy-ticket-button.tsx`
  - now mints using `onchainTierId`
  - parses `TicketMinted` log
  - posts real on-chain data to `/api/tickets/buy`
- `web/app/organizer/events/new/page.tsx`
  - organizer can now create multiple ticket tiers in draft mode
- `web/app/organizer/events/page.tsx`
  - publish flow now supports multi-tier events

## 7. Deployment / Environment State

### Contracts
- A new `EventFactory` v2 was deployed to Polygon Amoy.
- Latest deployed factory address:
  - `0xB16Fda8dF2a77F0d2962b99B5438e9c10b63FC0F`

### Frontend Env
- `web/.env.local` should point to:
  - `NEXT_PUBLIC_EVENT_FACTORY_ADDRESS=0xB16Fda8dF2a77F0d2962b99B5438e9c10b63FC0F`

### Important Distinction
- `contracts/.env` is for Hardhat deploy config.
- `web/.env.local` is for Next.js runtime config.
- Roles are not controlled by env vars.

## 8. Current Status Right Now

### Verified
- Hardhat tests passed after the multi-tier contract upgrade.
- Web production build passed after the frontend/backend updates.
- Prisma schema was pushed to Supabase after adding `onchainTierId`.
- New EventFactory v2 was deployed to Amoy.

### In Progress / Most Recent Runtime Issue
The latest publish flow issue on Amoy was:
- transaction gas tip too low for the network minimum
- the frontend was patched to set a higher `maxPriorityFeePerGas` and `maxFeePerGas`

This patch was applied in:
- `web/components/organizer/publish-event-button.tsx`

The next AI agent should verify in-browser whether publish now succeeds end-to-end after restarting the dev server.

## 9. Known Risks / Things To Double-Check
- Some legacy events may still exist from the v1 single-price contract era.
- Legacy events may not have `onchainTierId`; current backend/frontend keeps a compatibility fallback.
- Existing docs in `docs/` may still describe the older single-price system in some places.
- Windows local environment occasionally hits Node/ESLint out-of-memory issues. Build is more reliable than lint in this environment.
- If publish still fails, inspect:
  - wallet fee settings
  - actual receipt logs
  - contract address recovery fallback
  - organizer ownership checks

## 10. What Is Not Finished Yet
- Confirmed end-to-end browser validation that multi-tier publish succeeds on Amoy after the fee patch
- Secondary marketplace contracts and UI
- QR code ticket generation / check-in verification flow
- Organizer analytics dashboard
- Event management improvements beyond publish
- Mainnet hardening, gas optimization, and audit work

## 11. Recommended Immediate Next Steps
1. Restart the Next.js dev server so the latest env/code is active.
2. Re-test organizer publish flow on Amoy using the new factory address.
3. If publish succeeds:
   - verify `contractAddress` is saved in DB
   - verify `TicketTier.onchainTierId` is populated
   - verify public event page shows event as live
4. Re-test buy flow for a published multi-tier event.
5. Confirm `/api/tickets/buy` stores real `txHash` and `tokenId`.

## 12. Recommended Next Phases After Publish/Buy Stability
### Phase 4: Marketplace
- Implement secondary market contract
- Support listing, buying, cancelling listings
- Respect royalty logic

### Phase 5: Check-in
- Generate QR payload from owned ticket
- Add organizer-side verification and on-chain/off-chain check-in state handling

### Phase 6: Organizer Analytics
- Revenue by tier
- Sales volume by tier
- Check-in counts
- Contract-linked organizer dashboards

### Phase 7: Mainnet Readiness
- Gas optimization
- Security review / audit pass
- Better indexing/log strategy
- Mainnet deploy and env separation

## 13. Key Files For The Next AI Agent
- `contracts/contracts/EventTicketNFT.sol`
- `contracts/contracts/EventFactory.sol`
- `contracts/test/EventFactory.test.ts`
- `web/prisma/schema.prisma`
- `web/lib/contracts.ts`
- `web/components/organizer/publish-event-button.tsx`
- `web/components/tickets/buy-ticket-button.tsx`
- `web/app/api/organizer/events/route.ts`
- `web/app/api/events/[id]/go-live/route.ts`
- `web/app/api/tickets/buy/route.ts`
- `web/app/organizer/events/new/page.tsx`
- `web/app/organizer/events/page.tsx`

