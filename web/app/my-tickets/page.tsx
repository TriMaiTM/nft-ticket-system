import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";
import { TicketQR } from "@/components/tickets/ticket-qr";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function MyTicketsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const session = verifySessionToken(token);

  if (!session) {
    return (
      <section className="events-root">
        <video
          className="hero-video"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="hero-overlay" />
        <div className="hero-content-layer">
          <main className="events-main">
            <div className="events-empty">
              <p>Please sign in with wallet to view your tickets.</p>
              <p>
                <Link href="/" className="event-inline-link">
                  Go back to home
                </Link>
              </p>
            </div>
          </main>
        </div>
      </section>
    );
  }

  const tickets = await prisma.ticket.findMany({
    where: { ownerId: session.sub },
    include: {
      event: {
        select: {
          title: true,
          venue: true,
          startDate: true,
          chainId: true,
        },
      },
      tier: {
        select: {
          name: true,
          price: true,
          benefits: true,
        },
      },
      owner: {
        select: {
          walletAddress: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="events-root">
      <video
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
          <Link href="/events" className="pill-button pill-button-dark">
            <span className="pill-button-glow" aria-hidden="true" />
            <span className="pill-button-inner">Browse Events</span>
          </Link>
        </nav>

        <main className="events-main">
          <header className="events-header">
            <p className="events-eyebrow">Wallet Inventory</p>
            <h1 className="events-title">My NFT Tickets</h1>
            <p className="events-subtitle">
              Track every ticket in your wallet, including token ID and event schedule.
            </p>
          </header>

          {tickets.length === 0 ? (
            <div className="events-empty">
              <p>You do not own any tickets yet.</p>
              <p>
                Start from <Link href="/events" className="event-inline-link">Browse Events</Link>.
              </p>
            </div>
          ) : (
            <div className="events-grid">
              {tickets.map((ticket) => (
                <article className="event-card" key={ticket.id}>
                  <div className="event-card-top">
                    <span className="event-status">{ticket.status}</span>
                    <span className="event-chain">Token #{ticket.tokenId}</span>
                  </div>

                  <h3 className="event-title">{ticket.event.title}</h3>
                  <p className="event-description">
                    Tier: {ticket.tier.name} · {Number(ticket.tier.price).toFixed(3)} POL
                  </p>

                  <div className="event-meta-grid">
                    <div>
                      <p className="event-meta-label">Venue</p>
                      <p className="event-meta-value">{ticket.event.venue ?? "TBA"}</p>
                    </div>
                    <div>
                      <p className="event-meta-label">Start</p>
                      <p className="event-meta-value">{formatDate(ticket.event.startDate)}</p>
                    </div>
                    <div>
                      <p className="event-meta-label">Chain</p>
                      <p className="event-meta-value">{ticket.event.chainId ?? "Unknown"}</p>
                    </div>
                    <div>
                      <p className="event-meta-label">Mint Tx</p>
                      <p className="event-meta-value tx-line">{ticket.txHash ?? "Pending"}</p>
                    </div>
                  </div>
                  <TicketQR
                    ticketId={ticket.id}
                    eventId={ticket.eventId}
                    tokenId={ticket.tokenId}
                    ownerAddress={ticket.owner.walletAddress}
                  />
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
