import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygonAmoy } from "wagmi/chains";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "DEMO_PROJECT_ID";

export const wagmiConfig = getDefaultConfig({
  appName: "TicketNFT",
  projectId,
  chains: [polygonAmoy],
  ssr: true,
});
