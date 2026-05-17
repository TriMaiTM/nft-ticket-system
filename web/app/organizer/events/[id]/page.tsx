import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";
import { EventSettingsForm } from "@/components/organizer/event-settings-form";

type OrganizerEventDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrganizerEventDetailPage({ params }: OrganizerEventDetailPageProps) {
  const { id } = await params;
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
                <Link href="/" className="event-inline-link">Go back home</Link>
              </p>
            </div>
          </main>
        </div>
      </section>
    );
  }

  const event = await prisma.event.findUnique({
    where: { id, organizerId: session.sub },
    include: {
      ticketTiers: {
        orderBy: { price: "asc" },
      },
      tickets: {
        select: {
          id: true,
          status: true,
          isUsed: true,
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const totalTickets = event.ticketTiers.reduce((sum, tier) => sum + tier.maxQuantity, 0);
  const soldTickets = event.ticketTiers.reduce((sum, tier) => sum + tier.soldCount, 0);
  const usedTickets = event.tickets.filter((t) => t.isUsed).length;

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
          <Link href="/organizer/events" className="pill-button pill-button-dark">
            <span className="pill-button-glow" aria-hidden="true" />
            <span className="pill-button-inner">Back to My Events</span>
          </Link>
        </nav>

        <main className="events-main">
          <header className="events-header">
            <p className="events-eyebrow">Event Dashboard</p>
            <h1 className="events-title">{event.title}</h1>
            <p className="events-subtitle">
              Manage event lifecycle and monitor real-time ticket sales.
            </p>
          </header>

          <div className="event-meta-grid" style={{ marginBottom: "32px" }}>
            <div className="event-card">
              <p className="event-meta-label">Status</p>
              <p className="event-meta-value">{event.status}</p>
            </div>
            <div className="event-card">
              <p className="event-meta-label">Total Revenue</p>
              <p className="event-meta-value">
                {event.ticketTiers.reduce((sum, tier) => sum + Number(tier.price) * tier.soldCount, 0).toFixed(3)} POL
              </p>
            </div>
            <div className="event-card">
              <p className="event-meta-label">Tickets Sold</p>
              <p className="event-meta-value">{soldTickets} / {totalTickets}</p>
            </div>
            <div className="event-card">
              <p className="event-meta-label">Attendees Checked-in</p>
              <p className="event-meta-value">{usedTickets} / {soldTickets}</p>
            </div>
          </div>

          {event.contractAddress ? (
            <EventSettingsForm 
              eventId={event.id} 
              contractAddress={event.contractAddress} 
              currentStatus={event.status} 
            />
          ) : (
            <div className="buy-ticket-message err">
              Publish this event on-chain to access event management settings.
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
