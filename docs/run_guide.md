# Huong dan chay thu du an TicketNFT

## 1. Dieu kien can truoc
- Da cai Node.js ban LTS (khuyen nghi Node 20+).
- Da cai npm (di kem Node.js).
- Dang dung Windows PowerShell.

Kiem tra nhanh:

```powershell
node -v
npm -v
```

## 2. Cau truc hien tai
- Thu muc web: ung dung Next.js (landing page da implement).
- Thu muc contracts: da setup Hardhat + TypeScript + OpenZeppelin, co contracts va test baseline.
- Thu muc automation: script start.ps1 (snapshot-based), fund.ps1.

## 3. Quick Start (Khuyen nghi)

### Lan dau tien (deploy + seed + save snapshot):
```powershell
cd D:\HK8\TicketNFT
powershell -ExecutionPolicy Bypass -File .\automation\start.ps1
```

Script se tu dong:
1. Start Hardhat node (port 8545)
2. Deploy EventFactory + TicketMarketplace
3. Fund organizer wallet
4. Seed database
5. Save snapshot (lan sau khong can deploy lai)
6. Start Next.js dev server

### Lan sau (restore snapshot, giu nguyen moi thu):
```powershell
powershell -ExecutionPolicy Bypass -File .\automation\start.ps1
```

### Bat buoc deploy lai (xoa snapshot cu):
```powershell
powershell -ExecutionPolicy Bypass -File .\automation\start.ps1 -Fresh
```

### Chi start Hardhat (khong start Next.js):
```powershell
powershell -ExecutionPolicy Bypass -File .\automation\start.ps1 -SkipWeb
```

## 4. Cau hinh MetaMask cho Local Hardhat

- Network Name: Hardhat Local
- RPC URL: http://127.0.0.1:8545
- Chain ID: 31337
- Currency Symbol: ETH

Import tai khoan tu Hardhat (co 20 ETH mac dinh):
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` (Account #0, 10000 ETH)

Hoac su dung nut "Get ETH" tren UI de nạp 50 ETH tu dong.

## 5. Workflow Tao Event va Ban Ve

1. Mo http://localhost:3000
2. Ket noi vi MetaMask (network Hardhat Local)
3. Nhan "Sign In Wallet" de dang nhap
4. Nhan "Create Event" de tao su kien (se tu dong nang role len ORGANIZER)
5. Vao "My Events" -> nhan "Publish On-chain" de deploy ticket contract len Hardhat
6. Switch sang tai khoan buyer -> vao "Browse Events" -> "Mua ve"
7. Vao "My Tickets" de xem QR code
8. Vao "Check-in Scanner" de quet QR

## 6. Quan ly ETH

- Nut "Get ETH" xuat hien tren navbar khi ket noi Hardhat local
- Hoac chay: `powershell -ExecutionPolicy Bypass -File .\automation\fund.ps1 -WalletAddress 0xYourAddress`

## 7. Cac lenh rieng le

### Web App:
```powershell
cd D:\HK8\TicketNFT\web
npm install                # Cai dependencies
npm run dev                # Chay dev server
npm run build              # Build production
npm run start              # Chay production local
npm run lint               # Kiem tra code
npm run prisma:generate    # Generate Prisma client
npm run prisma:push        # Push schema len DB
npm run prisma:seed        # Seed demo data
npm run prisma:studio      # Mo Prisma Studio
```

### Contracts:
```powershell
cd D:\HK8\TicketNFT\contracts
npm install                # Cai dependencies
npm run compile            # Compile contracts
npm run test               # Chay tests
npm run deploy:local       # Deploy len Hardhat local
npm run deploy:amoy        # Deploy len Amoy testnet
```

### Utilities:
```powershell
# Clear event data (giu User + Auth)
cd D:\HK8\TicketNFT\web
node clear-events.js

# Check blockchain state
node check-state.js
```

## 8. Loi thuong gap

### "Failed to create sign-in nonce"
- Nguyen nhan: Database chua ket noi duoc
- Kiem tra DATABASE_URL trong .env.local
- Chay: `npm run prisma:push`
- Kiem tra Supabase project con active khong

### "Transaction failed" / "Insufficient funds"
- Nhan nut "Get ETH" tren hoac chay fund script

### Data bi mat sau khi restart
- Dung `start.ps1` (khong phai `start-local.ps1` cu)
- Script se tu restore snapshot

### Contract address thay doi
- `start.ps1` tu dong cap nhat .env.local
- Neu dung lenh rieng le, chay: `npm run event:link:contract`

## 9. Kiem tra chat luong code

```powershell
# Contracts
cd D:\HK8\TicketNFT\contracts
npm run test

# Web
cd D:\HK8\TicketNFT\web
npm run lint
npm run build
```
