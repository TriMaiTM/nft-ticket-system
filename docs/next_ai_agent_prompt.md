You are taking over an in-progress Web3 fullstack NFT ticketing project in the workspace `D:\HK8\TicketNFT`.

Read these files first:
- `docs/ai_agent_handoff_2026-04-28.md`
- `docs/project_handoff_summary.md`
- `docs/execution_plan.md`
- `docs/run_guide.md`

Project context:
- Next.js App Router frontend
- Supabase + Prisma backend/data layer
- Hardhat + Solidity smart contracts
- Wallet-signature auth
- Role-based access with `USER`, `ORGANIZER`, `ADMIN`
- Strict on-chain enforcement for ticket buying: no DB ticket record before successful mint receipt

Important architecture rules:
- Draft events are off-chain and should be organizer-only.
- Published events must be backed by a real on-chain contract deployed through `EventFactory`.
- Ticket purchase flow must remain:
  - mint on-chain
  - wait for receipt
  - extract real `txHash` and `tokenId`
  - then persist DB record
- Do not weaken this rule.

Current status:
- Multi-tier contract upgrade has been implemented.
- `EventTicketNFT` now supports tier IDs with separate prices and supplies.
- `EventFactory` now deploys events with tier arrays.
- Frontend and backend publish/buy flows were updated to support `TicketTier.onchainTierId`.
- New Amoy EventFactory v2 address:
  - `0xB16Fda8dF2a77F0d2962b99B5438e9c10b63FC0F`
- `web/.env.local` has been updated to use this address.
- The last live issue being worked through was organizer publish on Amoy, specifically around gas fee handling and publish confirmation flow.

Your immediate task:
1. Verify the organizer publish flow works end-to-end in the current codebase.
2. If publish still fails, debug the exact failing step:
   - wallet fee settings
   - contract call
   - receipt parsing
   - fallback contract-address recovery
   - DB go-live sync
3. Once publish succeeds, verify the buy flow still works for multi-tier events and still obeys the strict on-chain persistence rule.

Files most relevant to the current blocker:
- `web/components/organizer/publish-event-button.tsx`
- `web/lib/contracts.ts`
- `web/app/api/events/[id]/go-live/route.ts`
- `web/app/api/tickets/buy/route.ts`
- `contracts/contracts/EventFactory.sol`
- `contracts/contracts/EventTicketNFT.sol`

After solving the current publish/buy stability issue, continue with the next highest-value phase that keeps the project aligned with the original vision:
- marketplace
- QR check-in
- organizer analytics

Do not assume older docs are fully up to date; prefer the latest handoff file plus the actual code.
