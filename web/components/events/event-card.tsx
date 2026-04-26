import Link from "next/link";

type EventCardProps = {
  id: string;
  title: string;
  description: string | null;
  venue: string | null;
  startDate: Date;
  status: "DRAFT" | "PUBLISHED" | "ONGOING" | "ENDED" | "CANCELLED";
  chainId: string | null;
  ticketSummary: {
    minPrice: number | null;
    maxPrice: number | null;
    totalQuantity: number;
  };
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatPrice(value: number | null): string {
  if (value === null) {
    return "TBA";
  }
  return `${value.toFixed(3)} POL`;
}

export function EventCard({
  id,
  title,
  description,
  venue,
  startDate,
  status,
  chainId,
  ticketSummary,
}: EventCardProps) {
  return (
    <article className="event-card">
      <div className="event-card-top">
        <span className="event-status">{status}</span>
        <span className="event-chain">{chainId ?? "Unknown chain"}</span>
      </div>

      <h3 className="event-title">{title}</h3>
      <p className="event-description">
        {description ?? "No description yet. Organizer will publish details soon."}
      </p>

      <div className="event-meta-grid">
        <div>
          <p className="event-meta-label">Venue</p>
          <p className="event-meta-value">{venue ?? "TBA"}</p>
        </div>
        <div>
          <p className="event-meta-label">Start</p>
          <p className="event-meta-value">{formatDate(startDate)}</p>
        </div>
        <div>
          <p className="event-meta-label">Tickets</p>
          <p className="event-meta-value">{ticketSummary.totalQuantity}</p>
        </div>
        <div>
          <p className="event-meta-label">Price Range</p>
          <p className="event-meta-value">
            {formatPrice(ticketSummary.minPrice)} - {formatPrice(ticketSummary.maxPrice)}
          </p>
        </div>
      </div>

      <Link href={`/events/${id}`} className="pill-button pill-button-light event-card-cta">
        <span className="pill-button-glow" aria-hidden="true" />
        <span className="pill-button-inner">View Tickets</span>
      </Link>
    </article>
  );
}
