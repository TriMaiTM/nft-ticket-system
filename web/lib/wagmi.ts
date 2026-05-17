import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
import { http } from "wagmi";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "DEMO_PROJECT_ID";

const SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "https://sepolia.drpc.org";

export const wagmiConfig = getDefaultConfig({
  appName: "TicketNFT",
  projectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC),
  },
  ssr: true,
});
