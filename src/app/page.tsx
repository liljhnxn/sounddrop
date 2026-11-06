"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
} from "wagmi";
import {
  Music,
  Heart,
  ExternalLink,
  Plus,
  Search,
  Trash2,
  Disc3,
  TrendingUp,
  Clock,
  User,
  Copy,
  Check,
  AlertCircle,
  X,
  Loader2,
  Sparkles,
  Volume2,
  Compass,
} from "lucide-react";
import { SOUND_DROP_ABI } from "@/contracts/SoundDropABI";
import {
  SOUND_DROP_ADDRESS,
  BOTCHAIN_CHAIN_ID,
  BOTCHAIN_EXPLORER_URL,
} from "@/config/contract";

// Types
export interface SongItem {
  id: bigint;
  title: string;
  artist: string;
  platform: string;
  url: string;
  description: string;
  author: `0x${string}`;
  timestamp: bigint;
  likeCount: bigint;
  isActive: boolean;
}

// Fallback initial curation if the smart contract is freshly deployed with 0 songs
const CURATED_INITIAL_SONGS: SongItem[] = [
  {
    id: 1n,
    title: "Blinding Lights",
    artist: "The Weeknd",
    platform: "Spotify",
    url: "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b",
    description: "Peak 80s synth-pop revival that never gets old. Timeless energy.",
    author: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    timestamp: BigInt(Math.floor(Date.now() / 1000) - 86400 * 3),
    likeCount: 42n,
    isActive: true,
  },
  {
    id: 2n,
    title: "Midnight City",
    artist: "M83",
    platform: "YouTube",
    url: "https://www.youtube.com/watch?v=dX3k_QDnzHE",
    description: "The saxophone solo at 3:04 is transcendental. Best night-drive anthem.",
    author: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
    timestamp: BigInt(Math.floor(Date.now() / 1000) - 86400 * 2),
    likeCount: 38n,
    isActive: true,
  },
  {
    id: 3n,
    title: "Get Lucky",
    artist: "Daft Punk ft. Pharrell Williams",
    platform: "Spotify",
    url: "https://open.spotify.com/track/69FtXegLqO7uD2xWfH8pZJ",
    description: "Nile Rodgers funk guitar riff perfection. Modern French house classic.",
    author: "0x53d284357ec70cE289D6D64134DfAc8E511c8a3D",
    timestamp: BigInt(Math.floor(Date.now() / 1000) - 3600 * 12),
    likeCount: 29n,
    isActive: true,
  },
  {
    id: 4n,
    title: "Strobe",
    artist: "deadmau5",
    platform: "SoundCloud",
    url: "https://soundcloud.com/deadmau5/strobe",
    description: "10-minute progressive house journey. The definition of electronic builds.",
    author: "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5",
    timestamp: BigInt(Math.floor(Date.now() / 1000) - 3600 * 4),
    likeCount: 19n,
    isActive: true,
  },
];

export default function SoundDropApp() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();

  // Navigation / Filter States
  const [activeTab, setActiveTab] = useState<"all" | "trending" | "latest" | "my-drops">("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Modal States
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [songToRemove, setSongToRemove] = useState<SongItem | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formArtist, setFormArtist] = useState("");
  const [formPlatform, setFormPlatform] = useState("Spotify");
  const [formUrl, setFormUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Notification Banner
  const [notification, setNotification] = useState<{
    type: "info" | "success" | "error";
    message: string;
    txHash?: string;
  } | null>(null);

  // Optimistic like state tracking
  const [localLikedMap, setLocalLikedMap] = useState<Record<string, boolean>>({});
  const [localLikesCount, setLocalLikesCount] = useState<Record<string, bigint>>({});

  // Contract Reads
  const {
    data: contractSongs,
    refetch: refetchSongs,
    isLoading: isSongsLoading,
  } = useReadContract({
    address: SOUND_DROP_ADDRESS,
    abi: SOUND_DROP_ABI,
    functionName: "getAllSongs",
    query: {
      refetchInterval: 10000,
    },
  });

  const {
    data: contractStats,
    refetch: refetchStats,
  } = useReadContract({
    address: SOUND_DROP_ADDRESS,
    abi: SOUND_DROP_ABI,
    functionName: "getStats",
    query: {
      refetchInterval: 10000,
    },
  });

  // Contract Writes
  const {
    writeContractAsync,
    data: writeTxHash,
    isPending: isWritePending,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isTxConfirming,
    isSuccess: isTxSuccess,
    isError: isTxError,
  } = useWaitForTransactionReceipt({
    hash: writeTxHash,
  });

  // Handle transaction states
  useEffect(() => {
    if (isTxSuccess) {
      setNotification({
        type: "success",
        message: "Transaction confirmed on Botchain!",
        txHash: writeTxHash,
      });
      refetchSongs();
      refetchStats();
      resetWrite();
    } else if (isTxError) {
      setNotification({
        type: "error",
        message: "Transaction failed on-chain. Please check your gas or inputs.",
      });
      resetWrite();
    }
  }, [isTxSuccess, isTxError, writeTxHash, refetchSongs, refetchStats, resetWrite]);

  // Read batch liked status for user
  const songIds = useMemo(() => {
    if (!contractSongs || contractSongs.length === 0) return [];
    return contractSongs.map((s) => s.id);
  }, [contractSongs]);

  const { data: userLikesBatch } = useReadContract({
    address: SOUND_DROP_ADDRESS,
    abi: SOUND_DROP_ABI,
    functionName: "batchHasLiked",
    args: address && songIds.length > 0 ? [songIds, address] : undefined,
    query: {
      enabled: Boolean(address && songIds.length > 0),
    },
  });

  // Consolidate songs list: uses contract songs if available, fallback if empty
  const rawSongsList: SongItem[] = useMemo(() => {
    if (contractSongs && contractSongs.length > 0) {
      return contractSongs.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        platform: s.platform,
        url: s.url,
        description: s.description,
        author: s.author,
        timestamp: s.timestamp,
        likeCount: s.likeCount,
        isActive: s.isActive,
      }));
    }
    // Return sample songs if contract not yet initialized with songs
    return CURATED_INITIAL_SONGS;
  }, [contractSongs]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (contractStats) {
      return {
        total: Number(contractStats[0]),
        active: Number(contractStats[1]),
        likes: Number(contractStats[2]),
      };
    }
    const active = rawSongsList.filter((s) => s.isActive);
    const totalLikes = active.reduce((acc, curr) => acc + Number(curr.likeCount), 0);
    return {
      total: rawSongsList.length,
      active: active.length,
      likes: totalLikes,
    };
  }, [contractStats, rawSongsList]);

  // Filter and sort songs
  const filteredSongs = useMemo(() => {
    return rawSongsList
      .filter((song) => song.isActive)
      .filter((song) => {
        // Tab filter
        if (activeTab === "my-drops") {
          if (!address) return false;
          return song.author.toLowerCase() === address.toLowerCase();
        }
        return true;
      })
      .filter((song) => {
        // Platform filter
        if (selectedPlatform === "All") return true;
        return song.platform.toLowerCase() === selectedPlatform.toLowerCase();
      })
      .filter((song) => {
        // Search filter
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          song.title.toLowerCase().includes(q) ||
          song.artist.toLowerCase().includes(q) ||
          song.description.toLowerCase().includes(q) ||
          song.author.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (activeTab === "trending") {
          return Number(b.likeCount - a.likeCount);
        }
        // default / latest: sort by timestamp descending
        return Number(b.timestamp - a.timestamp);
      });
  }, [rawSongsList, activeTab, selectedPlatform, searchQuery, address]);

  // Helpers
  const formatTime = (ts: bigint) => {
    try {
      const seconds = Math.floor(Date.now() / 1000 - Number(ts));
      if (seconds < 60) return "just now";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `${days}d ago`;
      const months = Math.floor(days / 30);
      if (months < 12) return `${months}mo ago`;
      return `${Math.floor(months / 12)}y ago`;
    } catch {
      return "recently";
    }
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Determine if a song is liked by current user
  const isSongLikedByUser = (song: SongItem, index: number) => {
    const key = `${song.id.toString()}-${address?.toLowerCase() || ""}`;
    if (localLikedMap[key] !== undefined) {
      return localLikedMap[key];
    }
    if (userLikesBatch && userLikesBatch[index] !== undefined) {
      return userLikesBatch[index];
    }
    return false;
  };

  const getEffectiveLikes = (song: SongItem) => {
    const key = song.id.toString();
    if (localLikesCount[key] !== undefined) {
      return localLikesCount[key];
    }
    return song.likeCount;
  };

  // Handle Like / Unlike
  const handleToggleLike = async (song: SongItem, index: number) => {
    if (!isConnected || !address) {
      setNotification({
        type: "info",
        message: "Please connect your MetaMask wallet to like drops.",
      });
      return;
    }

    if (currentChainId !== BOTCHAIN_CHAIN_ID) {
      setNotification({
        type: "error",
        message: "Please switch to Botchain Testnet (Chain ID 968).",
      });
      switchChain?.({ chainId: BOTCHAIN_CHAIN_ID });
      return;
    }

    const currentlyLiked = isSongLikedByUser(song, index);
    const key = `${song.id.toString()}-${address.toLowerCase()}`;
    const idKey = song.id.toString();
    const currentLikes = getEffectiveLikes(song);

    try {
      if (currentlyLiked) {
        // Optimistic update
        setLocalLikedMap((prev) => ({ ...prev, [key]: false }));
        setLocalLikesCount((prev) => ({
          ...prev,
          [idKey]: currentLikes > 0n ? currentLikes - 1n : 0n,
        }));

        setNotification({
          type: "info",
          message: `Unliking "${song.title}"... Confirm in MetaMask`,
        });

        const tx = await writeContractAsync({
          address: SOUND_DROP_ADDRESS,
          abi: SOUND_DROP_ABI,
          functionName: "unlikeSong",
          args: [song.id],
        });

        setNotification({
          type: "info",
          message: "Unlike submitted to Botchain! Waiting for block...",
          txHash: tx,
        });
      } else {
        // Optimistic update
        setLocalLikedMap((prev) => ({ ...prev, [key]: true }));
        setLocalLikesCount((prev) => ({
          ...prev,
          [idKey]: currentLikes + 1n,
        }));

        setNotification({
          type: "info",
          message: `Liking "${song.title}"... Confirm in MetaMask`,
        });

        const tx = await writeContractAsync({
          address: SOUND_DROP_ADDRESS,
          abi: SOUND_DROP_ABI,
          functionName: "likeSong",
          args: [song.id],
        });

        setNotification({
          type: "info",
          message: "Like submitted to Botchain! Waiting for block...",
          txHash: tx,
        });
      }
    } catch (err: unknown) {
      const error = err as { shortMessage?: string; message?: string };
      console.error("Like/Unlike error:", err);
      // Revert optimistic update
      setLocalLikedMap((prev) => ({ ...prev, [key]: currentlyLiked }));
      setLocalLikesCount((prev) => ({ ...prev, [idKey]: currentLikes }));
      setNotification({
        type: "error",
        message: error.shortMessage || error.message || "Transaction rejected or failed.",
      });
    }
  };

  // Handle Submit Song
  const handleSubmitSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isConnected || !address) {
      setFormError("Connect your wallet before dropping a song.");
      return;
    }

    if (currentChainId !== BOTCHAIN_CHAIN_ID) {
      setFormError("Switch network to Botchain Testnet (Chain ID 968).");
      switchChain?.({ chainId: BOTCHAIN_CHAIN_ID });
      return;
    }

    if (!formTitle.trim()) {
      setFormError("Song title is required.");
      return;
    }
    if (!formArtist.trim()) {
      setFormError("Artist name is required.");
      return;
    }
    if (!formUrl.trim() || !formUrl.startsWith("http")) {
      setFormError("A valid HTTP or HTTPS music URL is required.");
      return;
    }

    try {
      setNotification({
        type: "info",
        message: `Submitting "${formTitle}" to Botchain... Please sign in MetaMask.`,
      });

      const tx = await writeContractAsync({
        address: SOUND_DROP_ADDRESS,
        abi: SOUND_DROP_ABI,
        functionName: "submitSong",
        args: [
          formTitle.trim(),
          formArtist.trim(),
          formPlatform,
          formUrl.trim(),
          formDescription.trim(),
        ],
      });

      setNotification({
        type: "info",
        message: "Song drop submitted! Waiting for Botchain confirmation...",
        txHash: tx,
      });

      setIsSubmitModalOpen(false);
      setFormTitle("");
      setFormArtist("");
      setFormUrl("");
      setFormDescription("");
    } catch (err: unknown) {
      const error = err as { shortMessage?: string; message?: string };
      console.error("Submit error:", err);
      setFormError(error.shortMessage || error.message || "Failed to submit song.");
    }
  };

  // Handle Remove Song
  const handleConfirmRemove = async () => {
    if (!songToRemove) return;

    try {
      setNotification({
        type: "info",
        message: `Removing "${songToRemove.title}"... Please confirm in MetaMask.`,
      });

      const tx = await writeContractAsync({
        address: SOUND_DROP_ADDRESS,
        abi: SOUND_DROP_ABI,
        functionName: "removeSong",
        args: [songToRemove.id],
      });

      setNotification({
        type: "info",
        message: "Removal submitted to Botchain! Waiting for confirmation...",
        txHash: tx,
      });

      setSongToRemove(null);
    } catch (err: unknown) {
      const error = err as { shortMessage?: string; message?: string };
      console.error("Remove error:", err);
      setNotification({
        type: "error",
        message: error.shortMessage || error.message || "Failed to remove submission.",
      });
      setSongToRemove(null);
    }
  };

  // Platform badges styling
  const getPlatformBadge = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes("spotify")) {
      return {
        bg: "bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/30",
        label: "Spotify",
      };
    }
    if (p.includes("youtube")) {
      return {
        bg: "bg-[#FF0000]/10 text-[#FF4D4D] border-[#FF0000]/30",
        label: "YouTube",
      };
    }
    if (p.includes("soundcloud")) {
      return {
        bg: "bg-[#FF5500]/10 text-[#FF7700] border-[#FF5500]/30",
        label: "SoundCloud",
      };
    }
    if (p.includes("apple")) {
      return {
        bg: "bg-[#FC3C44]/10 text-[#FC3C44] border-[#FC3C44]/30",
        label: "Apple Music",
      };
    }
    return {
      bg: "bg-[#DFFF00]/10 text-[#DFFF00] border-[#DFFF00]/30",
      label: platform || "Music",
    };
  };

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white flex flex-col font-sans selection:bg-[#DFFF00] selection:text-black">
      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
          <div
            className={`p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 ${
              notification.type === "success"
                ? "bg-[#18181B]/95 border-[#DFFF00]/50 text-white shadow-[#DFFF00]/10"
                : notification.type === "error"
                ? "bg-[#18181B]/95 border-red-500/50 text-red-200"
                : "bg-[#18181B]/95 border-zinc-700 text-zinc-200"
            }`}
          >
            {notification.type === "success" && (
              <Sparkles className="w-5 h-5 text-[#DFFF00] shrink-0 mt-0.5" />
            )}
            {notification.type === "error" && (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            {notification.type === "info" && (
              <Loader2 className="w-5 h-5 text-[#DFFF00] shrink-0 mt-0.5 animate-spin" />
            )}

            <div className="flex-1 text-sm">
              <p className="font-medium text-white">{notification.message}</p>
              {notification.txHash && (
                <a
                  href={`${BOTCHAIN_EXPLORER_URL}/tx/${notification.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-[#DFFF00] hover:underline"
                >
                  View on Botchain Explorer <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <button
              onClick={() => setNotification(null)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TOP NAVIGATION */}
      <header className="sticky top-0 z-40 border-b border-[#27272A]/70 bg-[#0B0B0D]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#DFFF00] to-[#99cc00] flex items-center justify-center text-black shadow-[0_0_20px_rgba(223,255,0,0.3)]">
              <Disc3 className="w-6 h-6 animate-spin duration-7000" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white">
                  Sound<span className="text-[#DFFF00]">Drop</span>
                </span>
                <span className="text-[10px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-full bg-[#DFFF00]/10 text-[#DFFF00] border border-[#DFFF00]/20">
                  Botchain Testnet
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] hidden sm:block tracking-wide">
                Discover. Share. Repeat.
              </p>
            </div>
          </div>

          {/* Action buttons & Wallet */}
          <div className="flex items-center gap-3">
            {/* Submit CTA button */}
            <button
              onClick={() => {
                if (!isConnected) {
                  connect({ connector: connectors[0] });
                } else {
                  setIsSubmitModalOpen(true);
                }
              }}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-[#DFFF00] text-black hover:bg-[#c8e600] transition-all duration-200 shadow-[0_0_20px_rgba(223,255,0,0.25)] hover:shadow-[0_0_25px_rgba(223,255,0,0.4)] active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Drop a Song
            </button>

            {/* Network indicator / switch */}
            {isConnected && currentChainId !== BOTCHAIN_CHAIN_ID && (
              <button
                onClick={() => switchChain?.({ chainId: BOTCHAIN_CHAIN_ID })}
                className="px-3 py-2 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-all"
              >
                Switch to Chain 968
              </button>
            )}

            {/* Wallet Connect / Account Info */}
            {isConnected && address ? (
              <div className="flex items-center gap-2 bg-[#18181B] border border-[#27272A] rounded-xl p-1.5 pl-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#DFFF00] animate-pulse"></span>
                  <span className="text-xs font-mono text-zinc-300">
                    {shortenAddress(address)}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(address)}
                  title="Copy address"
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                >
                  {copiedAddress === address ? (
                    <Check className="w-3.5 h-3.5 text-[#DFFF00]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => disconnect()}
                  className="px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                disabled={isConnecting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-[#18181B] text-white border border-[#27272A] hover:border-[#DFFF00]/50 hover:text-[#DFFF00] transition-all duration-200 active:scale-95"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#DFFF00]" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-[#DFFF00]" />
                    Connect MetaMask
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 border-b border-[#27272A]/40 bg-gradient-to-b from-[#121215] to-[#0B0B0D]">
        {/* Glow ambient background elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#DFFF00]/5 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Tagline Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#18181B] border border-[#27272A] text-xs font-medium text-zinc-300 mb-6 shadow-inner">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DFFF00] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DFFF00]"></span>
              </span>
              <span>Decentralized Music Curation on Botchain</span>
            </div>

            {/* Hero Headline */}
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
              Find Your Next <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#DFFF00] to-[#b3e600]">
                Favourite Sound.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#A1A1AA] leading-relaxed mb-8 max-w-2xl mx-auto">
              SoundDrop is a permissionless, on-chain music recommendation protocol. Share the tracks you can&apos;t stop listening to, discover rare gems curated by real listeners, and upvote the sound of tomorrow.
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
              <button
                onClick={() => {
                  if (!isConnected) {
                    connect({ connector: connectors[0] });
                  } else {
                    setIsSubmitModalOpen(true);
                  }
                }}
                className="px-6 py-3.5 rounded-xl font-bold text-base bg-[#DFFF00] text-black hover:bg-[#c8e600] transition-all duration-200 shadow-[0_0_30px_rgba(223,255,0,0.3)] hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                Share a Track Now
              </button>

              <a
                href="#discover"
                className="px-6 py-3.5 rounded-xl font-medium text-base bg-[#18181B] text-zinc-300 border border-[#27272A] hover:border-zinc-500 hover:text-white transition-all duration-200 flex items-center gap-2"
              >
                <Compass className="w-5 h-5 text-[#DFFF00]" />
                Explore Discoveries
              </a>
            </div>

            {/* On-Chain Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
              <div className="p-4 rounded-2xl bg-[#18181B]/80 border border-[#27272A] backdrop-blur-md">
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-1">
                  <span>{stats.active}</span>
                </div>
                <div className="text-xs uppercase font-semibold text-[#A1A1AA] tracking-wider mt-1">
                  Active Drops
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#18181B]/80 border border-[#27272A] backdrop-blur-md">
                <div className="text-2xl sm:text-3xl font-extrabold text-[#DFFF00] tracking-tight flex items-center justify-center gap-1">
                  <span>{stats.likes}</span>
                </div>
                <div className="text-xs uppercase font-semibold text-[#A1A1AA] tracking-wider mt-1">
                  Total Likes
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-[#18181B]/80 border border-[#27272A] backdrop-blur-md">
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-1">
                  <span>{stats.total}</span>
                </div>
                <div className="text-xs uppercase font-semibold text-[#A1A1AA] tracking-wider mt-1">
                  Total Submitted
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DISCOVER MUSIC SECTION */}
      <main id="discover" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Controls: Search, Tabs, Platform Filters */}
        <div className="space-y-6 mb-8">
          {/* Top Row: Search & Section Tabs */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* View Tabs */}
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#18181B] border border-[#27272A] overflow-x-auto">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === "all"
                    ? "bg-[#DFFF00] text-black shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Music className="w-4 h-4" />
                All Drops
              </button>

              <button
                onClick={() => setActiveTab("trending")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === "trending"
                    ? "bg-[#DFFF00] text-black shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Most Liked
              </button>

              <button
                onClick={() => setActiveTab("latest")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === "latest"
                    ? "bg-[#DFFF00] text-black shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Clock className="w-4 h-4" />
                Latest Added
              </button>

              <button
                onClick={() => setActiveTab("my-drops")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                  activeTab === "my-drops"
                    ? "bg-[#DFFF00] text-black shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <User className="w-4 h-4" />
                My Submissions
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search title, artist, author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#18181B] border border-[#27272A] focus:border-[#DFFF00] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Platform Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mr-2">
              Platform:
            </span>
            {["All", "Spotify", "YouTube", "SoundCloud", "Apple Music", "Other"].map((platform) => {
              const isSelected = selectedPlatform.toLowerCase() === platform.toLowerCase();
              return (
                <button
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap border ${
                    isSelected
                      ? "bg-[#DFFF00]/15 text-[#DFFF00] border-[#DFFF00]"
                      : "bg-[#18181B] text-zinc-400 border-[#27272A] hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  {platform}
                </button>
              );
            })}
          </div>
        </div>

        {/* LOADING STATE */}
        {isSongsLoading && (
          <div className="py-24 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#DFFF00] mx-auto mb-4" />
            <p className="text-zinc-400 font-medium">Fetching music drops from Botchain...</p>
          </div>
        )}

        {/* SONG CARDS GRID */}
        {!isSongsLoading && (
          <>
            {filteredSongs.length === 0 ? (
              <div className="py-20 text-center rounded-3xl bg-[#18181B]/40 border border-[#27272A] p-8 max-w-xl mx-auto">
                <Disc3 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No song drops found</h3>
                <p className="text-sm text-zinc-400 mb-6">
                  {activeTab === "my-drops"
                    ? !isConnected
                      ? "Connect your MetaMask wallet to inspect and manage your drops."
                      : "You haven't submitted any tracks yet. Be the first to drop something special!"
                    : "No songs match your current filter or search criteria."}
                </p>
                {activeTab === "my-drops" && !isConnected ? (
                  <button
                    onClick={() => connect({ connector: connectors[0] })}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#DFFF00] text-black hover:bg-[#c8e600] transition"
                  >
                    Connect Wallet
                  </button>
                ) : (
                  <button
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#DFFF00] text-black hover:bg-[#c8e600] transition"
                  >
                    Drop a Song
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredSongs.map((song, index) => {
                  const badge = getPlatformBadge(song.platform);
                  const liked = isSongLikedByUser(song, index);
                  const effectiveLikes = getEffectiveLikes(song);
                  const isAuthor =
                    address && song.author.toLowerCase() === address.toLowerCase();

                  return (
                    <div
                      key={song.id.toString()}
                      className="group relative rounded-2xl bg-[#18181B] border border-[#27272A] hover:border-zinc-700 transition-all duration-300 p-6 flex flex-col justify-between hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]"
                    >
                      {/* Top Bar: Platform Badge & Time */}
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#A1A1AA]">
                            {formatTime(song.timestamp)}
                          </span>

                          {/* Author removal option */}
                          {isAuthor && (
                            <button
                              onClick={() => setSongToRemove(song)}
                              title="Remove submission"
                              className="text-zinc-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Song Title & Artist */}
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-[#DFFF00] transition line-clamp-1">
                          {song.title}
                        </h3>
                        <p className="text-base text-zinc-300 font-medium line-clamp-1 mt-0.5">
                          {song.artist}
                        </p>
                      </div>

                      {/* Optional Recommendation Note */}
                      {song.description && (
                        <div className="mb-5 p-3 rounded-xl bg-[#0B0B0D]/60 border border-[#27272A]/80 text-sm text-zinc-300 italic relative">
                          <span className="text-[#DFFF00] font-serif text-lg mr-1">&ldquo;</span>
                          {song.description}
                          <span className="text-[#DFFF00] font-serif text-lg ml-1">&rdquo;</span>
                        </div>
                      )}

                      {/* Footer: Submitter info, External Link & Like Action */}
                      <div className="pt-4 border-t border-[#27272A]/60 flex items-center justify-between gap-3 flex-wrap">
                        {/* Submitter */}
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono text-[10px] text-[#DFFF00]">
                            {song.author.slice(2, 4)}
                          </div>
                          <span>
                            by{" "}
                            <a
                              href={`${BOTCHAIN_EXPLORER_URL}/address/${song.author}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono hover:text-white hover:underline transition"
                            >
                              {shortenAddress(song.author)}
                            </a>
                            {isAuthor && (
                              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-[#DFFF00]/20 text-[#DFFF00]">
                                You
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Interactive Buttons: External Link & Like */}
                        <div className="flex items-center gap-2">
                          {/* Listen Button */}
                          <a
                            href={song.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#27272A]/70 text-zinc-200 hover:text-white hover:bg-zinc-700 transition"
                          >
                            <span>Listen</span>
                            <ExternalLink className="w-3.5 h-3.5 text-[#DFFF00]" />
                          </a>

                          {/* Like Button */}
                          <button
                            onClick={() => handleToggleLike(song, index)}
                            disabled={isWritePending || isTxConfirming}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-90 border ${
                              liked
                                ? "bg-[#DFFF00] text-black border-[#DFFF00] shadow-[0_0_15px_rgba(223,255,0,0.3)]"
                                : "bg-[#27272A]/70 text-zinc-300 border-transparent hover:border-[#DFFF00]/40 hover:text-white"
                            }`}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                liked ? "fill-black stroke-black" : "stroke-zinc-300"
                              }`}
                            />
                            <span>{effectiveLikes.toString()}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* SUBMIT SONG MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#18181B] border border-[#27272A] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsSubmitModalOpen(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#DFFF00]/10 border border-[#DFFF00]/30 flex items-center justify-center text-[#DFFF00]">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Drop a Track</h3>
                <p className="text-xs text-zinc-400">
                  Share your favorite sound on Botchain Testnet
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitSong} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Song Title <span className="text-[#DFFF00]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Blinding Lights"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-[#0B0B0D] border border-[#27272A] focus:border-[#DFFF00] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Artist Name <span className="text-[#DFFF00]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. The Weeknd"
                  value={formArtist}
                  onChange={(e) => setFormArtist(e.target.value)}
                  className="w-full bg-[#0B0B0D] border border-[#27272A] focus:border-[#DFFF00] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Platform <span className="text-[#DFFF00]">*</span>
                </label>
                <select
                  value={formPlatform}
                  onChange={(e) => setFormPlatform(e.target.value)}
                  className="w-full bg-[#0B0B0D] border border-[#27272A] focus:border-[#DFFF00] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none cursor-pointer"
                >
                  <option value="Spotify">Spotify</option>
                  <option value="YouTube">YouTube</option>
                  <option value="SoundCloud">SoundCloud</option>
                  <option value="Apple Music">Apple Music</option>
                  <option value="Bandcamp">Bandcamp</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Direct Music URL <span className="text-[#DFFF00]">*</span>
                </label>
                <input
                  type="url"
                  placeholder="https://open.spotify.com/track/... or https://youtube.com/..."
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full bg-[#0B0B0D] border border-[#27272A] focus:border-[#DFFF00] rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Why you love it (Optional Note)
                </label>
                <textarea
                  rows={2}
                  placeholder="What makes this track special? Tell fellow curators..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#0B0B0D] border border-[#27272A] focus:border-[#DFFF00] rounded-xl px-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isWritePending || isTxConfirming}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#DFFF00] text-black hover:bg-[#c8e600] transition disabled:opacity-50 flex items-center gap-2 shadow-[0_0_20px_rgba(223,255,0,0.3)]"
                >
                  {isWritePending || isTxConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      Publishing on Botchain...
                    </>
                  ) : (
                    "Publish Drop"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE CONFIRMATION MODAL */}
      {songToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#18181B] border border-red-500/30 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Remove Submission</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Are you sure you want to remove &quot;{songToRemove.title}&quot; from SoundDrop? This will deactivate the song on Botchain.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSongToRemove(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={isWritePending || isTxConfirming}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition disabled:opacity-50 flex items-center gap-2"
              >
                {isWritePending || isTxConfirming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Confirm Remove"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="mt-auto border-t border-[#27272A]/70 bg-[#0B0B0D] py-8 text-xs text-[#A1A1AA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">SoundDrop</span>
            <span>&bull;</span>
            <span>Discover. Share. Repeat.</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href={BOTCHAIN_EXPLORER_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#DFFF00] transition flex items-center gap-1"
            >
              Botchain Explorer <ExternalLink className="w-3 h-3" />
            </a>
            <span>Chain ID: 968</span>
            <span>Zero Backend &bull; 100% On-Chain</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
