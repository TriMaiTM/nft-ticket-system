"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWalletAuth } from "@/hooks/use-wallet-auth";

type TierForm = {
  name: string;
  price: string;
  maxQuantity: number;
  benefits: string;
};

type CreatePayload = {
  title: string;
  description: string;
  venue: string;
  startDate: string;
  endDate: string;
  maxAttendees: number;
  tiers: TierForm[];
};

function createDefaultTier(index: number): TierForm {
  if (index === 0) {
    return {
      name: "General",
      price: "0.05",
      maxQuantity: 500,
      benefits: "General admission",
    };
  }

  return {
    name: "",
    price: "0.08",
    maxQuantity: 100,
    benefits: "",
  };
}

export default function OrganizerCreateEventPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoadingSession } = useWalletAuth();

  const isOrganizer = useMemo(
    () => user?.role === "ORGANIZER" || user?.role === "ADMIN",
    [user?.role]
  );

  const [form, setForm] = useState<CreatePayload>({
    title: "",
    description: "",
    venue: "",
    startDate: "",
    endDate: "",
    maxAttendees: 500,
    tiers: [createDefaultTier(0)],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function updateTier(index: number, patch: Partial<TierForm>) {
    setForm((value) => ({
      ...value,
      tiers: value.tiers.map((tier, tierIndex) =>
        tierIndex === index ? { ...tier, ...patch } : tier
      ),
    }));
  }

  function addTier() {
    setForm((value) => ({
      ...value,
      tiers: [...value.tiers, createDefaultTier(value.tiers.length)],
    }));
  }

  function removeTier(index: number) {
    setForm((value) => ({
      ...value,
      tiers: value.tiers.filter((_, tierIndex) => tierIndex !== index),
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setIsError(false);

    try {
      if (form.tiers.length === 0) {
        throw new Error("Add at least one ticket tier.");
      }

      const response = await fetch("/api/organizer/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as {
        data?: { id: string };
        error?: string;
      };

      if (!response.ok || !payload.data?.id) {
        throw new Error(payload.error ?? "Failed to create event");
      }

      setMessage("Event created. Publish it on-chain from My Events when ready.");
      router.push(`/events/${payload.data.id}`);
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to create event";
      setIsError(true);
      setMessage(text);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingSession) {
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
              <p>Loading wallet session...</p>
            </div>
          </main>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
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
              <p>Please connect and sign in wallet first.</p>
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

  if (!isOrganizer) {
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
              <p>This account is not Organizer.</p>
              <p>
                Browse events in <Link href="/events" className="event-inline-link">Ticket Store</Link>.
              </p>
            </div>
          </main>
        </div>
      </section>
    );
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
          <Link href="/organizer/events" className="pill-button pill-button-dark">
            <span className="pill-button-glow" aria-hidden="true" />
            <span className="pill-button-inner">My Events</span>
          </Link>
        </nav>

        <main className="events-main">
          <header className="events-header">
            <p className="events-eyebrow">Organizer Studio</p>
            <h1 className="events-title">Create Event</h1>
            <p className="events-subtitle">
              Define event info and all ticket tiers in draft mode, then publish the NFT sale on-chain from My Events.
            </p>
          </header>

          <form className="event-create-form" onSubmit={onSubmit}>
            <label>
              <span>Event title</span>
              <input
                value={form.title}
                onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))}
                required
              />
            </label>

            <label>
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))}
                rows={3}
              />
            </label>

            <label>
              <span>Venue</span>
              <input
                value={form.venue}
                onChange={(e) => setForm((v) => ({ ...v, venue: e.target.value }))}
              />
            </label>

            <div className="event-form-grid">
              <label>
                <span>Start date/time</span>
                <input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm((v) => ({ ...v, startDate: e.target.value }))}
                  required
                />
              </label>
              <label>
                <span>End date/time</span>
                <input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm((v) => ({ ...v, endDate: e.target.value }))}
                  required
                />
              </label>
            </div>

            <label>
              <span>Max attendees</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.maxAttendees}
                onChange={(e) => setForm((v) => ({ ...v, maxAttendees: Number(e.target.value) }))}
              />
            </label>

            <div className="event-form-grid">
              <p className="event-meta-label">Ticket tiers</p>
              <button
                className="pill-button pill-button-dark"
                type="button"
                onClick={addTier}
              >
                <span className="pill-button-glow" aria-hidden="true" />
                <span className="pill-button-inner">Add Tier</span>
              </button>
            </div>

            {form.tiers.map((tier, index) => (
              <div className="event-card" key={`tier-${index}`}>
                <div className="event-card-top">
                  <span className="event-status">Tier {index + 1}</span>
                  {form.tiers.length > 1 ? (
                    <button
                      className="pill-button pill-button-dark"
                      type="button"
                      onClick={() => removeTier(index)}
                    >
                      <span className="pill-button-inner">Remove</span>
                    </button>
                  ) : (
                    <span className="event-chain">Required</span>
                  )}
                </div>

                <div className="event-form-grid">
                  <label>
                    <span>Tier name</span>
                    <input
                      value={tier.name}
                      onChange={(e) => updateTier(index, { name: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    <span>Price (POL)</span>
                    <input
                      type="number"
                      min="0.000001"
                      step="0.000001"
                      value={tier.price}
                      onChange={(e) => updateTier(index, { price: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    <span>Ticket quantity</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={tier.maxQuantity}
                      onChange={(e) => updateTier(index, { maxQuantity: Number(e.target.value) })}
                      required
                    />
                  </label>
                </div>

                <label>
                  <span>Tier benefits</span>
                  <input
                    value={tier.benefits}
                    onChange={(e) => updateTier(index, { benefits: e.target.value })}
                  />
                </label>
              </div>
            ))}

            <button className="pill-button pill-button-light" type="submit" disabled={isSubmitting}>
              <span className="pill-button-glow" aria-hidden="true" />
              <span className="pill-button-inner">
                {isSubmitting ? "Creating..." : "Create Event"}
              </span>
            </button>

            {message ? (
              <p className={isError ? "buy-ticket-message err" : "buy-ticket-message ok"}>
                {message}
              </p>
            ) : null}
          </form>
        </main>
      </div>
    </section>
  );
}
