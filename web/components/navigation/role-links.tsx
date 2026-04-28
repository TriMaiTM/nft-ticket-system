"use client";

import Link from "next/link";
import { useWalletAuth } from "@/hooks/use-wallet-auth";

export function RoleLinks() {
  const { isAuthenticated, user } = useWalletAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="hero-nav-links" role="list">
        <Link className="hero-nav-link" href="/events" role="listitem">
          <span>Ticket Store</span>
        </Link>
        <Link className="hero-nav-link" href="/my-tickets" role="listitem">
          <span>My Tickets</span>
        </Link>
      </div>
    );
  }

  if (user.role === "ORGANIZER" || user.role === "ADMIN") {
    return (
      <div className="hero-nav-links" role="list">
        <Link className="hero-nav-link" href="/organizer/events" role="listitem">
          <span>My Events</span>
        </Link>
        <Link className="hero-nav-link" href="/organizer/events/new" role="listitem">
          <span>Create Event</span>
        </Link>
        <Link className="hero-nav-link" href="/events" role="listitem">
          <span>Ticket Store</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="hero-nav-links" role="list">
      <Link className="hero-nav-link" href="/events" role="listitem">
        <span>Ticket Store</span>
      </Link>
      <Link className="hero-nav-link" href="/my-tickets" role="listitem">
        <span>My Tickets</span>
      </Link>
    </div>
  );
}
