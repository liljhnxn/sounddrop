import { SOUND_DROP_ABI } from "@/contracts/SoundDropABI";
import deployedInfo from "./deployedAddress.json";

// Contract address resolution: Env variable -> deployedAddress.json -> fallback zero address
export const SOUND_DROP_ADDRESS = ((process.env.NEXT_PUBLIC_SOUND_DROP_CONTRACT_ADDRESS &&
  process.env.NEXT_PUBLIC_SOUND_DROP_CONTRACT_ADDRESS !== "")
  ? process.env.NEXT_PUBLIC_SOUND_DROP_CONTRACT_ADDRESS
  : deployedInfo?.address && deployedInfo.address !== ""
  ? deployedInfo.address
  : "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const CONTRACT_CONFIG = {
  address: SOUND_DROP_ADDRESS,
  abi: SOUND_DROP_ABI,
} as const;

export const BOTCHAIN_EXPLORER_URL = "https://scan.bohr.life";
export const BOTCHAIN_RPC_URL = "https://rpc.bohr.life";
export const BOTCHAIN_CHAIN_ID = 968;
