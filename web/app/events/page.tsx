import Link from "next/link";
import { EventCard } from "@/components/events/event-card";
import { prisma } from "@/lib/prisma";

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    orderBy: { startDate: "asc" },
    include: {
      ticketTiers: {
        select: {
          price: true,
          maxQuantity: true,
        },
      },
    },
  });

  const mapped = events.map((event) => {
    const prices = event.ticketTiers.map((tier) => Number(tier.price));
    const minPrice = prices.length ? Math.min(...prices) : null;
    const maxPrice = prices.length ? Math.max(...prices) : null;
    const totalQuantity = event.ticketTiers.reduce(
      (sum, tier) => sum + tier.maxQuantity,
      0
    );

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      venue: event.venue,
      startDate: event.startDate,
      status: event.status,
      chainId: event.chainId,
      ticketSummary: {
        minPrice,
        maxPrice,
        totalQuantity,
      },
    };
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
          <div className="hero-navbar-left">
            <Link href="/" className="hero-logo" aria-label="Homepage">
              LOGOIPSUM
            </Link>
            <div className="hero-nav-links" role="list">
              <Link className="hero-nav-link" href="/events" role="listitem">
                <span>Events</span>
              </Link>
              <Link className="hero-nav-link" href="/my-tickets" role="listitem">
                <span>My Tickets</span>
              </Link>
              <Link className="hero-nav-link" href="#" role="listitem">
                <span>Organizer</span>
              </Link>
            </div>
          </div>

          <Link href="/" className="pill-button pill-button-dark">
            <span className="pill-button-glow" aria-hidden="true" />
            <span className="pill-button-inner">Back Home</span>
          </Link>
        </nav>

        <main className="events-main">
          <header className="events-header">
            <p className="events-eyebrow">Ticket Discovery</p>
            <h1 className="events-title">Browse On-Chain Event Tickets</h1>
            <p className="events-subtitle">
              Discover upcoming events, compare ticket tiers, and secure your NFT
              pass in seconds.
            </p>
          </header>

          {mapped.length === 0 ? (
            <div className="events-empty">
              <p>No events available yet.</p>
              <p>Ask organizer to publish the first event ticket drop.</p>
            </div>
          ) : (
            <div className="events-grid">
              {mapped.map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
