# 🎫 TicketNFT — Demo Script (3 Ví)

## Chuẩn bị

### Bước 1: Start Hardhat + Deploy + Setup

```powershell
cd D:\HK8\TicketNFT
powershell -ExecutionPolicy Bypass -File .\automation\start.ps1
```

### Bước 2: Setup demo data

```powershell
cd D:\HK8\TicketNFT\web
npm run demo:setup
```

### Bước 3: Import 3 ví vào MetaMask

Mở MetaMask → Import Account → Paste private key:

| Ví | Private Key | Địa chỉ | Vai trò |
|---|---|---|---|
| **Organizer** | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` | `0x7099...79C8` | Tạo event, publish, check-in |
| **User 1** | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` | `0x3C44...93BC` | Mua vé, bán trên marketplace |
| **User 2** | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` | `0x90F7...b906` | Mua vé từ marketplace |

**Quan trọng:** Thêm network Hardhat Local vào MetaMask:
- Network Name: `Hardhat Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency: `ETH`

---

## Demo Flow

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### PHẦN 1: ORGANIZER — Tạo Event & Publish On-chain
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Chuyển MetaMask sang ví Organizer (Account #1)**

#### Bước 1.1: Kết nối & Đăng nhập
1. Mở `http://localhost:3000`
2. Nhấn **"Connect Wallet"** → chọn MetaMask → chọn Account #1
3. Nhấn **"Sign In Wallet"** → ký message trên MetaMask
4. ✅ Thấy địa chỉ ví + nút "Sign out" = đăng nhập thành công

#### Bước 1.2: Tạo Event
1. Nhấn **"Create Event"** (hoặc vào `/organizer/events/new`)
2. Điền thông tin:
   - Title: `TicketNFT Launch Night`
   - Description: `Demo event for NFT ticketing`
   - Venue: `Ho Chi Minh City`
   - Start/End date: chọn ngày tương lai
   - Tiers: đã có sẵn (General 0.05, VIP 0.15, VVip 0.5)
3. Nhấn **"Create Event"**
4. ✅ Redirect sang trang event detail

#### Bước 1.3: Publish On-chain
1. Vào **"My Events"** (`/organizer/events`)
2. Thấy event mới tạo, trạng thái **"Not live"**
3. Nhấn **"Publish On-chain"**
4. MetaMask hiện popup → Confirm giao dịch
5. Đợi xác nhận (~2-3 giây trên Hardhat local)
6. ✅ Thấy `Contract: 0x...` = publish thành công!
7. ✅ Trạng thái chuyển sang **"On-chain"**

> **Giải thích cho người xem:** "Event vừa được deploy lên blockchain dưới dạng smart contract riêng biệt. Mỗi event = 1 contract NFT."

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### PHẦN 2: USER 1 — Mua Vé
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Chuyển MetaMask sang ví User 1 (Account #2)**

#### Bước 2.1: Kết nối & Đăng nhập
1. Refresh trang (hoặc nhấn Sign out rồi connect lại)
2. Connect ví Account #2
3. **"Sign In Wallet"** → ký message

#### Bước 2.2: Browse Events
1. Nhấn **"Browse Events"** (hoặc `/events`)
2. ✅ Thấy "TicketNFT Launch Night" trong danh sách (chỉ event đã publish mới hiện)

#### Bước 2.3: Mua Vé
1. Nhấn vào event → xem chi tiết
2. Thấy 3 tier: General (0.05 POL), VIP (0.15 POL), VVIP (0.5 POL)
3. Nhấn **"Mua vé"** ở tier **VIP**
4. MetaMask hiện popup → Confirm (gửi 0.15 ETH)
5. Đợi ~2 giây
6. ✅ Thấy `Mua vé thành công! Token #...`

> **Giải thích:** "User vừa mint 1 NFT vé trên blockchain. Token ID unique, metadata URI chứa thông tin vé."

#### Bước 2.4: Xem Vé
1. Vào **"My Tickets"** (`/my-tickets`)
2. ✅ Thấy vé VIP vừa mua
3. Nhấn **"Hiện QR"** → thấy mã QR
4. ✅ QR chứa {ticketId, eventId, tokenId, owner}

> **Giải thích:** "QR code này chứa cryptographic proof. Chỉ owner ví này mới generate được."

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### PHẦN 3: USER 1 — Bán Vé trên Marketplace
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Vẫn đang ở ví User 1 (Account #2)**

#### Bước 3.1: List Vé
1. Ở trang **My Tickets**, tìm vé VIP
2. Nhấn **"Rao bán vé này"**
3. MetaMask hiện 2 lần:
   - Lần 1: **Approve** — cho phép marketplace quản lý NFT này
   - Lần 2: **List** — đăng bán trên smart contract
4. Nhập giá bán: `0.3` (gấp đôi giá mua)
5. Confirm cả 2 giao dịch
6. ✅ Thấy vé chuyển trạng thái **"ĐANG RAO BÁN"**

> **Giải thích:** "User approve marketplace contract quản lý NFT, rồi gọi listTicket() trên marketplace. Giá bán = 0.3 ETH, royalty 5% sẽ tự động trả cho organizer khi có người mua."

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### PHẦN 4: USER 2 — Mua Vé từ Marketplace
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Chuyển MetaMask sang ví User 2 (Account #3)**

#### Bước 4.1: Kết nối & Đăng nhập
1. Refresh → Connect Account #3 → Sign In

#### Bước 4.2: Marketplace
1. Vào **Marketplace** (`/marketplace`)
2. ✅ Thấy vé VIP đang được rao bán với giá 0.3 ETH
3. Thấy người bán = `0x3C44...` (User 1)

#### Bước 4.3: Mua Vé
1. Nhấn **"Mua lại vé này"**
2. MetaMask hiện popup → Confirm (gửi 0.3 ETH)
3. Đợi ~2 giây
4. ✅ Redirect sang My Tickets

> **Giải thích:** "Giao dịch marketplace vừa xảy ra:
> - User 2 trả 0.3 ETH
> - Platform fee 2.5% = 0.0075 ETH → platform
> - Royalty 5% = 0.015 ETH → organizer (tự động!)
> - Còn lại 0.2775 ETH → User 1 (người bán)
> - NFT ownership chuyển từ User 1 → User 2"

#### Bước 4.4: Verify
1. Ở trang **My Tickets**, ✅ thấy vé VIP với Token # trùng với vé User 1 đã bán
2. Nhấn **"Hiện QR"** → QR mới với owner address = User 2

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### PHẦN 5: ORGANIZER — Check-in
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Chuyển MetaMask sang ví Organizer (Account #1)**

#### Bước 5.1: Check-in Scanner
1. Vào **Check-in Scanner** (`/organizer/check-in`)
2. Dùng 1 trong 3 cách:
   - **Camera scan:** Đưa QR của User 2 vào camera
   - **Upload ảnh QR:** Chọn file ảnh QR
   - **Paste payload:** Copy payload từ My Tickets → Paste vào

#### Bước 5.2: Verify
1. ✅ Thấy `Check-in thành công! Token #...`
2. Quét lại cùng QR → ❌ `Ticket has already been used`

> **Giải thích:** "Check-in đánh dấu vé đã sử dụng trong database. Không thể dùng lại vé này. Trong production, sẽ gọi thêm smart contract useTicket() để đánh dấu trên blockchain."

---

### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
### PHẦN 6: ORGANIZER — Withdraw Funds
### ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#### Bước 6.1: Rút tiền
1. Vào **My Events** (`/organizer/events`)
2. Nhấn **"Withdraw"** ở event
3. MetaMask confirm
4. ✅ Nhận tiền từ cả:
   - Vé User 1 mua (0.05 POL từ primary sale)
   - Royalty từ marketplace (0.015 POL từ secondary sale)

---

## Tóm tắt Demo (nói theo flow)

```
"Tôi sẽ demo hệ thống bán vé NFT với 3 vai trò:

1. ORGANIZER tạo sự kiện và publish lên blockchain
   → Mỗi event = 1 smart contract riêng

2. USER 1 mua vé VIP từ trang sự kiện
   → Mint NFT trên blockchain, thanh toán bằng crypto

3. USER 1 bán lại vé trên marketplace với giá gấp đôi
   → Approve + List trên smart contract marketplace

4. USER 2 mua lại vé từ marketplace
   → Royalty tự động trả cho organizer, platform fee tự động trừ

5. ORGANIZER check-in User 2 tại cổng
   → Scan QR, verify on-chain, đánh dấu đã sử dụng

6. ORGANIZER withdraw funds
   → Nhận tiền từ cả primary sale và secondary market royalty"
```

## Thời gian demo ước tính

| Phần | Thời gian |
|---|---|
| Setup (start + import ví) | 2 phút |
| Phần 1: Organizer tạo + publish | 3 phút |
| Phần 2: User 1 mua vé | 2 phút |
| Phần 3: User 1 bán marketplace | 2 phút |
| Phần 4: User 2 mua marketplace | 2 phút |
| Phần 5: Check-in | 2 phút |
| Phần 6: Withdraw | 1 phút |
| **Tổng** | **~14 phút** |
