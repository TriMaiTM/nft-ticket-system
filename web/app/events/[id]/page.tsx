import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyTicketButton } from "@/components/tickets/buy-ticket-button";
import { prisma } from "@/lib/prisma";

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organizer: {
        select: {
          walletAddress: true,
        },
      },
      ticketTiers: {
        orderBy: { price: "asc" },
      },
    },
  });

  if (!event) {
    notFound();
  }

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
            <span className="pill-button-inner">Back to Events</span>
          </Link>
        </nav>

        <main className="events-main">
          <header className="events-header">
            <p className="events-eyebrow">Event Detail</p>
            <h1 className="events-title">{event.title}</h1>
            <p className="events-subtitle">
              {event.description ?? "Organizer will update event detail soon."}
            </p>
            {!event.contractAddress ? (
              <p className="buy-ticket-message err">
                Event is waiting for organizer to publish on-chain before tickets can be bought.
              </p>
            ) : null}
          </header>

          <div className="events-grid">
            {event.ticketTiers.map((tier) => (
              <article className="event-card" key={tier.id}>
                <div className="event-card-top">
                  <span className="event-status">{tier.name}</span>
                  <span className="event-chain">{event.chainId ?? "Unknown chain"}</span>
                </div>
                <h3 className="event-title">{tier.name} Ticket</h3>
                <p className="event-description">{tier.benefits ?? "Standard access"}</p>
                <div className="event-meta-grid">
                  <div>
                    <p className="event-meta-label">Price</p>
                    <p className="event-meta-value">{Number(tier.price).toFixed(3)} POL</p>
                  </div>
                  <div>
                    <p className="event-meta-label">Quantity</p>
                    <p className="event-meta-value">{tier.maxQuantity}</p>
                  </div>
                  <div>
                    <p className="event-meta-label">Sold</p>
                    <p className="event-meta-value">{tier.soldCount}</p>
                  </div>
                  <div>
                    <p className="event-meta-label">Venue</p>
                    <p className="event-meta-value">{event.venue ?? "TBA"}</p>
                  </div>
                </div>
                <BuyTicketButton
                  tierId={tier.id}
                  tierName={tier.name}
                  tierPrice={tier.price.toString()}
                  onchainTierId={tier.onchainTierId}
                  eventContractAddress={event.contractAddress}
                />
              </article>
            ))}
          </div>
        </main>
      </div>
    </section>
  );
}
