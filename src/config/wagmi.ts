import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

export const botchain = defineChain({
  id: 677,
  name: "BOT Chain",
  nativeCurrency: {
    decimals: 18,
    name: "BOT",
    symbol: "BOT",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.botchain.ai"],
    },
    public: {
      http: ["https://rpc.botchain.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "BOT Chain Explorer",
      url: "https://scan.botchain.ai",
    },
  },
  testnet: false,
});

export const wagmiConfig = createConfig({
  chains: [botchain],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [botchain.id]: http("https://rpc.botchain.ai"),
  },
  ssr: true,
});
