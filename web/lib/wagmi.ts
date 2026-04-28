import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygonAmoy, hardhat } from "wagmi/chains";
import { http } from "wagmi";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "DEMO_PROJECT_ID";

export const wagmiConfig = getDefaultConfig({
  appName: "TicketNFT",
  projectId,
  chains: [polygonAmoy, hardhat],
  transports: {
    [polygonAmoy.id]: http(),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});
