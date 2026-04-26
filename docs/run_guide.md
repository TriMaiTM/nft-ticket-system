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

## 3. Chay web app local (development)
Truoc khi chay wallet connect, tao file `.env.local` trong thu muc `web` (copy tu `.env.example`):

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YOUR_WALLETCONNECT_PROJECT_ID
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_REF:YOUR_DB_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
AUTH_SECRET=CHANGE_TO_A_LONG_RANDOM_SECRET
```

Neu chua co project id, tao tren WalletConnect Cloud de lay id.
Neu dung Supabase, lay DB password va project ref trong Project Settings -> Database.

Di chuyen vao thu muc web va cai dependencies:

```powershell
Set-Location "D:\HK8\TicketNFT\web"
npm install
```

Chay dev server:

```powershell
npm run dev
```

Mo trinh duyet:
- URL mac dinh: http://localhost:3000

Neu port 3000 da bi chiem, Next.js se goi y port khac (vi du 3001).

Kiem tra nhanh wallet stack:
- Nut `Connect Wallet` xuat hien o navbar.
- Ket noi vi va dam bao network la Polygon Amoy.

Khoi tao Prisma schema (lan dau):

Luu y: voi Supabase, uu tien `prisma db push` de dong bo schema nhanh.

```powershell
Set-Location "D:\HK8\TicketNFT\web"
npm run prisma:generate
npm run prisma:push
```

Neu ban muon tao migration file (thay vi push), van co the dung:

```powershell
npm run prisma:migrate -- --name init
```

Wallet auth MVP API da san sang:
- `POST /api/auth/nonce`
- `POST /api/auth/verify`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Seed du lieu demo (de test trang events nhanh):

```powershell
Set-Location "D:\HK8\TicketNFT\web"
npm run prisma:seed
```

Kiem tra wallet auth ngay tren UI:
- Bam `Connect Wallet`.
- Sau khi ket noi thanh cong, nut doi thanh `Sign In Wallet`.
- Bam `Sign In Wallet` va ky message tren vi.
- Neu thanh cong, nut hien dia chi vi va co `Sign out`.

## 4. Build thu production
Trong thu muc web:

```powershell
npm run build
```

Neu build thanh cong, ban se thay thong tin route duoc prerender.

## 5. Chay ban production local
Sau khi build thanh cong:

```powershell
npm run start
```

Mo trinh duyet:
- URL mac dinh: http://localhost:3000

## 6. Kiem tra chat luong code
Trong thu muc web:

```powershell
npm run lint
```

## 7. Quy trinh chay nhanh de test giao dien
Dung quy trinh nay moi khi pull code moi:

```powershell
Set-Location "D:\HK8\TicketNFT\web"
npm install
npm run lint
npm run build
npm run dev
```

## 8. Loi thuong gap va cach xu ly
### Loi: node khong duoc nhan dien
- Mo terminal moi.
- Kiem tra lai Node.js da cai dung chua: node -v
- Neu chua co, cai Node.js LTS roi mo lai VS Code.

### Loi: port 3000 dang duoc dung
Co the chay tren port khac:

```powershell
npm run dev -- -p 3001
```

### Loi: dependency conflict sau khi doi nhanh
Thu xoa node_modules va cai lai:

```powershell
Set-Location "D:\HK8\TicketNFT\web"
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

## 9. Chay contracts (Hardhat)
Di chuyen vao thu muc contracts va cai dependencies:

```powershell
Set-Location "D:\HK8\TicketNFT\contracts"
npm install
```

Compile smart contracts:

```powershell
npm run compile
```

Chay test smart contracts:

```powershell
npm run test
```

Deploy local (network hardhat):

```powershell
npm run deploy:local
```

Deploy testnet Polygon Amoy:

1. Tao file `.env` trong thu muc contracts (co the copy tu `.env.example`).
2. Dien gia tri:
  - `AMOY_RPC_URL`
  - `PRIVATE_KEY`
  - `POLYGONSCAN_API_KEY` (khuyen nghi co de verify ve sau)

```powershell
Set-Location "D:\HK8\TicketNFT\contracts"
npm run deploy:amoy
```

## 10. Quy trinh test nhanh toan bo
Sau moi lan cap nhat code:

```powershell
Set-Location "D:\HK8\TicketNFT\contracts"
npm run test

Set-Location "D:\HK8\TicketNFT\web"
npm run lint
npm run build
```

## 11. Ghi chu cho giai doan tiep theo
- Khi setup database (Prisma/PostgreSQL), bo sung huong dan:
  - tao file .env.local
  - migrate schema
  - seed data
