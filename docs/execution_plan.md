# TicketNFT - Execution Plan & Implementation Notes

## 1) Muc tieu hien tai
- Khoi tao monorepo co web app va docs.
- Hoan thanh landing hero section theo visual direction da chot.
- Dat nen tang de tiep tuc Phase 1 -> Phase 5 trong implementation_plan.md.

## 2) Da hoan thanh trong dot nay
- Tao ung dung Next.js (TypeScript, App Router, ESLint) tai thu muc web.
- Chinh sua landing page thanh full-screen hero voi:
  - Nen den tuyet doi (#000000).
  - Video background fullscreen, loop, muted, autoplay, playsInline.
  - Lop overlay den 50% de tang do doc.
  - Navbar theo dung bo cuc: logo + 4 nav links (an tren mobile) + Join Waitlist button.
  - Hero center content: badge, heading gradient text, subtitle, CTA button.
  - Responsive behavior theo md breakpoint (heading scale down, nav links collapse, top padding mobile/desktop).
- Tao thu muc docs de luu ke hoach va luu y.
- Setup contracts workspace voi Hardhat + TypeScript + OpenZeppelin.
- Implement smart contracts baseline:
  - EventTicketNFT.sol (ERC-721 + ERC-2981, mint, useTicket, transfer control, withdraw)
  - EventFactory.sol (factory tao event contract, quan ly danh sach event)
- Them test baseline trong contracts/test va da run pass.
- Hoan thanh wallet stack core trong web:
  - Wagmi + Viem + RainbowKit + TanStack Query providers
  - Navbar da tich hop connect wallet button
  - Them `web/.env.example` cho WalletConnect project id
- Hoan thanh wallet auth MVP (backend API):
  - `POST /api/auth/nonce` tao challenge message
  - `POST /api/auth/verify` verify signature va set session cookie
  - `GET /api/auth/me` lay session user
  - `POST /api/auth/logout` clear session
  - Them model `AuthNonce` trong Prisma schema
- Hoan thanh wallet auth tren UI:
  - Connect button tu dong ho tro sign-in bang nonce/signature
  - Co sign-out control tren navbar
- Them `prisma:seed` + script seed event demo de test nhanh API/events

## 3) Luu y ky thuat quan trong
- Font:
  - Theme hien tai dung General Sans qua Fontshare CSS import.
  - Neu production can toi uu, nen self-host font files va preload.
- Video background:
  - Nen co fallback poster image va fallback gradient background khi mang cham.
  - Nen doi link video sang static asset CDN do team quan ly de tranh rot URL.
- Accessibility:
  - Cac nut va nav links can co destination route thuc te trong sprint tiep theo.
  - Can bo sung focus-visible styles cho keyboard navigation.

## 4) Ke hoach tiep theo theo phase

### Phase 1 (Contracts Foundation)
- [x] Setup Hardhat + TypeScript + OpenZeppelin trong thu muc contracts.
- [x] Implement EventTicketNFT (ERC-721 + ERC-2981) + unit tests.
- [x] Implement EventFactory + tests.
- [x] Tao script deploy local trong contracts/scripts/deploy.ts.
- [x] Chuan bi script deploy testnet (Polygon Amoy uu tien).
- [x] Bo sung test cho royaltyInfo, maxSupply edge cases, withdraw flow.
- [x] Add TicketMarketplace.sol skeleton (bat dau cho Phase 4).
- [x] Chay deploy testnet Amoy voi credentials that su (.env) va luu contract address.

### Phase 2 (Web Core)
- [x] Setup wallet stack: Wagmi + Viem + RainbowKit.
- [x] Setup Prisma + Supabase PostgreSQL config (DATABASE_URL).
- [x] Chay prisma:push tren Supabase project va verify bang API events/auth.
- [x] Setup auth strategy ban dau theo wallet sign-in (MVP).
- [x] Dung base design system va reusable UI components (landing + wallet state components).

### Phase 3 (Core Product Flows)
- Event detail + buy ticket flow.
- Organizer create event + contract deploy flow.
- Mint ticket + metadata upload IPFS.
- My tickets + QR generation.

### Phase 4 (Marketplace + Check-in)
- Implement TicketMarketplace.sol + tests.
- Build marketplace UI va listing lifecycle.
- Build QR check-in flow (verify + mark used).

### Phase 5 (Polish + Deploy)
- Hardening UX/loading/error states.
- Security review (contracts + API).
- E2E tests + deployment to Vercel and mainnet-ready pipeline.

## 5) Quy uoc lam viec de giam rui ro
- Moi feature blockchain deu can:
  - Unit test contracts.
  - Integration test front-to-contract.
  - Manual runbook test tren testnet.
- Tach bien moi truong ro rang:
  - .env.local (web)
  - .env (contracts)
- Khong merge PR neu chua qua lint, type-check, test.

## 6) Decision log tam thoi (co the cap nhat)
- Chain uu tien: Polygon Amoy (testnet) -> Polygon PoS (mainnet).
- Wallet strategy MVP: vi wallet truyen thong truoc, account abstraction sau.
- Theme landing: dark cinematic, video-first, high contrast typography.
- Amoy deploy (2026-04-25): EventFactory = 0x38fBD0a1f2DA7d05B768f67c17B7B88d1F19C57e.
- Database strategy (2026-04-26): Supabase-first, khong uu tien local PostgreSQL.
