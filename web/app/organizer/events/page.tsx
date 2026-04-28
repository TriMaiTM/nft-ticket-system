import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";
import { PublishEventButton } from "@/components/organizer/publish-event-button";
import { WithdrawButton } from "@/components/organizer/withdraw-button";

export default async function OrganizerEventsPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(getSessionCookieName())?.value);

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
              <p>Please sign in with organizer wallet first.</p>
              <p>
                <Link href="/" className="event-inline-link">
                  Go back home
                </Link>
              </p>
            </div>
          </main>
        </div>
      </section>
    );
  }

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      role: true,
      walletAddress: true,
    },
  });

  if (!me || (me.role !== "ORGANIZER" && me.role !== "ADMIN")) {
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
              <p>This account does not have organizer permission.</p>
              <p>
                Go to <Link href="/events" className="event-inline-link">Ticket Store</Link>.
              </p>
            </div>
          </main>
        </div>
      </section>
    );
  }

  const events = await prisma.event.findMany({
    where: { organizerId: me.id },
    orderBy: { createdAt: "desc" },
    include: {
      ticketTiers: {
        orderBy: { createdAt: "asc" },
      },
    },
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
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <Link href="/organizer/check-in" className="pill-button pill-button-dark">
              <span className="pill-button-glow" aria-hidden="true" />
              <span className="pill-button-inner">Check-in Scanner</span>
            </Link>
            <Link href="/organizer/events/new" className="pill-button pill-button-light">
            <span className="pill-button-glow" aria-hidden="true" />
            <span className="pill-button-inner">Create Event</span>
          </Link></div></nav>

        <main className="events-main">
          <header className="events-header">
            <p className="events-eyebrow">Organizer Workspace</p>
            <h1 className="events-title">My Events</h1>
            <p className="events-subtitle">
              Manage your events, publish them on-chain, and monitor ticket inventory.
            </p>
          </header>

          {events.length === 0 ? (
            <div className="events-empty">
              <p>You have not created any events yet.</p>
              <p>
                Start by <Link href="/organizer/events/new" className="event-inline-link">creating the first event</Link>.
              </p>
            </div>
          ) : (
            <div className="events-grid">
              {events.map((event) => {
                const totalQty = event.ticketTiers.reduce((sum, tier) => sum + tier.maxQuantity, 0);
                const soldQty = event.ticketTiers.reduce((sum, tier) => sum + tier.soldCount, 0);

                return (
                  <article className="event-card" key={event.id}>
                    <div className="event-card-top">
                      <span className="event-status">{event.status}</span>
                      <span className="event-chain">
                        {event.contractAddress ? "On-chain" : "Not live"}
                      </span>
                    </div>
                    <h3 className="event-title">{event.title}</h3>
                    <p className="event-description">{event.description ?? "No description"}</p>

                    <div className="event-meta-grid">
                      <div>
                        <p className="event-meta-label">Venue</p>
                        <p className="event-meta-value">{event.venue ?? "TBA"}</p>
                      </div>
                      <div>
                        <p className="event-meta-label">Date</p>
                        <p className="event-meta-value">{event.startDate.toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="event-meta-label">Tickets</p>
                        <p className="event-meta-value">{soldQty}/{totalQty}</p>
                      </div>
                      <div>
                        <p className="event-meta-label">Tiers</p>
                        <p className="event-meta-value">{event.ticketTiers.length}</p>
                      </div>
                      <div>
                        <p className="event-meta-label">Contract</p>
                        <p className="event-meta-value tx-line">{event.contractAddress ?? "Pending"}</p>
                      </div>
                    </div>

                    <Link href={`/events/${event.id}`} className="pill-button pill-button-dark event-card-cta">
                      <span className="pill-button-glow" aria-hidden="true" />
                      <span className="pill-button-inner">View Event</span>
                    </Link>

                    {event.contractAddress ? (
                      <WithdrawButton contractAddress={event.contractAddress} />
                    ) : (
                      <PublishEventButton
                        eventId={event.id}
                        eventTitle={event.title}
                        organizerWalletAddress={me.walletAddress}
                        tiers={event.ticketTiers.map((tier) => ({
                          id: tier.id,
                          name: tier.name,
                          price: tier.price.toString(),
                          maxQuantity: tier.maxQuantity,
                        }))}
                        contractAddress={event.contractAddress}
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

