import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEther } from "viem";
import { BuyListedTicket } from "@/components/marketplace/buy-listed-ticket";
import { cookies } from "next/headers";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function MarketplacePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const session = verifySessionToken(token);

  const listings = await prisma.listing.findMany({
    where: { status: "ACTIVE" },
    include: {
      ticket: {
        include: {
          tier: true,
        },
      },
      event: true,
      seller: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="events-root">
      <video
        suppressHydrationWarning
        className="hero-video"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="hero-overlay" />

      <div className="hero-content-layer">
        <nav className="hero-navbar" aria-label="Primary">
          <Link href="/" className="hero-logo" aria-label="Homepage">
            LOGOIPSUM
          </Link>
          <Link href="/my-tickets" className="pill-button pill-button-dark">
            <span className="pill-button-glow" aria-hidden="true" />
            <span className="pill-button-inner">My Tickets</span>
          </Link>
        </nav>

        <main className="events-main">
          <header className="events-header">
            <p className="events-eyebrow">Secondary Market</p>
            <h1 className="events-title">Ticket Marketplace</h1>
            <p className="events-subtitle">
              Buy and sell verified NFT tickets securely via smart contracts.
            </p>
          </header>

          {listings.length === 0 ? (
            <div className="events-empty">
              <p>Hiện không có vé nào đang được rao bán.</p>
            </div>
          ) : (
            <div className="events-grid">
              {listings.map((listing) => {
                const isSeller = session?.sub === listing.sellerId;
                const formattedPrice = formatEther(BigInt(listing.price));

                return (
                  <article className="event-card" key={listing.id}>
                    <div className="event-card-top">
                      <span className="event-status" style={{ background: "rgba(0, 200, 100, 0.2)", color: "#00FF66", border: "1px solid rgba(0, 200, 100, 0.5)" }}>
                        ĐANG BÁN
                      </span>
                      <span className="event-chain">Token #{listing.ticket.tokenId}</span>
                    </div>

                    <h3 className="event-title">{listing.event.title}</h3>
                    <p className="event-description">
                      Tier: {listing.ticket.tier.name}
                    </p>

                    <div className="event-meta-grid" style={{ marginTop: "16px", background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px" }}>
                      <div>
                        <p className="event-meta-label">Giá bán</p>
                        <p className="event-meta-value" style={{ fontSize: "18px", color: "#fff" }}>
                          {formattedPrice} POL
                        </p>
                      </div>
                      <div>
                        <p className="event-meta-label">Người bán</p>
                        <p className="event-meta-value tx-line" title={listing.seller.walletAddress}>
                          {isSeller ? "Bạn" : `${listing.seller.walletAddress.substring(0, 6)}...${listing.seller.walletAddress.substring(38)}`}
                        </p>
                      </div>
                    </div>

                    <div className="event-meta-grid" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "12px" }}>
                      <div>
                        <p className="event-meta-label">Sự kiện bắt đầu</p>
                        <p className="event-meta-value">{formatDate(listing.event.startDate)}</p>
                      </div>
                      <div>
                        <p className="event-meta-label">Địa điểm</p>
                        <p className="event-meta-value">{listing.event.venue ?? "TBA"}</p>
                      </div>
                    </div>

                    {isSeller ? (
                      <div style={{ marginTop: "16px", textAlign: "center", padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                        <p style={{ margin: 0, fontSize: "14px", color: "#aaa" }}>Đây là vé bạn đang rao bán</p>
                      </div>
                    ) : (
                      <BuyListedTicket
                        ticketId={listing.ticketId}
                        tokenId={listing.ticket.tokenId}
                        contractAddress={listing.event.contractAddress!}
                        priceWei={listing.price}
                      />
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
