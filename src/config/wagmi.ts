import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

export const botchainTestnet = defineChain({
  id: 968,
  name: "Botchain Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "BOHR",
    symbol: "BOHR",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.bohr.life"],
    },
    public: {
      http: ["https://rpc.bohr.life"],
    },
  },
  blockExplorers: {
    default: {
      name: "Botchain Explorer",
      url: "https://scan.bohr.life",
    },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [botchainTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [botchainTestnet.id]: http("https://rpc.bohr.life"),
  },
  ssr: true,
});

