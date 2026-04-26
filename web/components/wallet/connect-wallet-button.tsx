"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWalletAuth } from "@/hooks/use-wallet-auth";

export function ConnectWalletButton() {
  const {
    user,
    isAuthenticated,
    isLoadingSession,
    isSigningIn,
    error,
    signIn,
    signOut,
  } = useWalletAuth();

  return (
    <div className="wallet-actions">
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const ready = mounted;
          const connected = ready && !!account && !!chain;

          if (!ready || isLoadingSession) {
            return (
              <button className="pill-button pill-button-dark" type="button" disabled>
                <span className="pill-button-glow" aria-hidden="true" />
                <span className="pill-button-inner">Loading...</span>
              </button>
            );
          }

          if (!connected) {
            return (
              <button
                className="pill-button pill-button-dark"
                onClick={openConnectModal}
                type="button"
              >
                <span className="pill-button-glow" aria-hidden="true" />
                <span className="pill-button-inner">Connect Wallet</span>
              </button>
            );
          }

          if (chain.unsupported) {
            return (
              <button
                className="pill-button pill-button-dark"
                onClick={openChainModal}
                type="button"
              >
                <span className="pill-button-glow" aria-hidden="true" />
                <span className="pill-button-inner">Wrong Network</span>
              </button>
            );
          }

          if (!isAuthenticated || user?.walletAddress !== account.address.toLowerCase()) {
            return (
              <button className="pill-button pill-button-dark" onClick={signIn} type="button">
                <span className="pill-button-glow" aria-hidden="true" />
                <span className="pill-button-inner">
                  {isSigningIn ? "Signing In..." : "Sign In Wallet"}
                </span>
              </button>
            );
          }

          return (
            <button
              className="pill-button pill-button-dark"
              onClick={openAccountModal}
              type="button"
            >
              <span className="pill-button-glow" aria-hidden="true" />
              <span className="pill-button-inner">{account.displayName}</span>
            </button>
          );
        }}
      </ConnectButton.Custom>

      {isAuthenticated ? (
        <button className="wallet-signout" onClick={signOut} type="button">
          Sign out
        </button>
      ) : null}

      {error ? <p className="wallet-error">{error}</p> : null}
    </div>
  );
}
