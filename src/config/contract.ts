import { SOUND_DROP_ABI } from "@/contracts/SoundDropABI";
import deployedInfo from "./deployedAddress.json";

// Contract address resolution: Env variable -> deployedAddress.json -> fallback
export const SOUND_DROP_ADDRESS = ((process.env.NEXT_PUBLIC_SOUND_DROP_CONTRACT_ADDRESS &&
  process.env.NEXT_PUBLIC_SOUND_DROP_CONTRACT_ADDRESS !== "")
  ? process.env.NEXT_PUBLIC_SOUND_DROP_CONTRACT_ADDRESS
  : deployedInfo?.address && deployedInfo.address !== ""
  ? deployedInfo.address
  : "0xD1c202A518580a58F9fE4f9bC2C8F2cD8adFF9ad") as `0x${string}`;

export const CONTRACT_CONFIG = {
  address: SOUND_DROP_ADDRESS,
  abi: SOUND_DROP_ABI,
} as const;

export const BOTCHAIN_CHAIN_ID = 677;
export const BOTCHAIN_RPC_URL = process.env.BOTCHAIN_RPC_URL || "https://rpc.botchain.ai";
export const BOTCHAIN_EXPLORER_URL = "https://scan.botchain.ai";
export const BOTCHAIN_WEBSITE_URL = "https://botchain.ai";
export const BOTCHAIN_NATIVE_TOKEN = "BOT";
