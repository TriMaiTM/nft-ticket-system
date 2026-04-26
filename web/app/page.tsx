import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";

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
            <a href="#" className="hero-logo" aria-label="Homepage">
              LOGOIPSUM
            </a>

            <div className="hero-nav-links" role="list">
              {[
                "Get Started",
                "Developers",
                "Features",
                "Resources",
              ].map((label) => (
                <a className="hero-nav-link" href="#" key={label} role="listitem">
                  <span>{label}</span>
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
                </a>
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
              <h1 className="hero-title">Web3 at the Speed of Experience</h1>
              <p className="hero-subtitle">
                Powering seamless experiences and real-time connections, EOS is
                the base for creators who move with purpose, leveraging
                resilience, speed, and scale to shape the future.
              </p>
            </div>

            <button className="pill-button pill-button-light" type="button">
              <span className="pill-button-glow" aria-hidden="true" />
              <span className="pill-button-inner">Join Waitlist</span>
            </button>
          </main>
        </div>
      </div>
    </section>
  );
}
