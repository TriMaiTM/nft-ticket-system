import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import Link from "next/link";

export default function Home() {
  return (
    <section className="hero-root">
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
              {[
                { label: "Events", href: "/events" },
                { label: "My Tickets", href: "/my-tickets" },
                { label: "Organizer", href: "/events" },
                { label: "Marketplace", href: "#" },
              ].map((item) => (
                <Link className="hero-nav-link" href={item.href} key={item.label} role="listitem">
                  <span>{item.label}</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M3.5 5.25L7 8.75L10.5 5.25"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          <ConnectWalletButton />
        </nav>

        <div className="hero-main-wrap">
          <main className="hero-main-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" aria-hidden="true" />
              <span className="hero-badge-muted">Early access available from</span>
              <span> May 1, 2026</span>
            </div>

            <div className="hero-title-block">
              <h1 className="hero-title">NFT Tickets at the Speed of Experience</h1>
              <p className="hero-subtitle">
                Discover verified on-chain events, mint your tickets in seconds,
                and move through check-in with seamless wallet-native access.
              </p>
            </div>

            <Link href="/events" className="pill-button pill-button-light">
              <span className="pill-button-glow" aria-hidden="true" />
              <span className="pill-button-inner">Browse Events</span>
            </Link>
          </main>
        </div>
      </div>
    </section>
  );
}
