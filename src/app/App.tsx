import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import confetti from "canvas-confetti";
import api from "./api.js";
import {
  CheckCircle, AlertCircle, FileText, FileCode, LogOut, Plus, Users,
  X, Copy, Search, Trash2, Download, Sparkles
} from "lucide-react";

// ── telegram logo ─────────────────────────────────────────────────────────────

function TelegramLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tg-grad" x1="120" y1="0" x2="120" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2AABEE"/>
          <stop offset="1" stopColor="#229ED9"/>
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="120" fill="url(#tg-grad)"/>
      <path d="M54 117.5c34.6-15.1 57.7-25 69.4-29.8 33-13.7 39.9-16.1 44.3-16.2 1 0 3.2.2 4.6 1.5 1.2 1.1 1.5 2.5 1.7 3.6.1 1 .3 3.3.1 5.1-1.9 20-10.2 68.5-14.4 90.9-1.8 9.5-5.3 12.6-8.6 12.9-7.3.7-12.9-4.8-20-9.4-11.1-7.3-17.4-11.8-28.2-18.9-12.5-8.2-4.4-12.7 2.7-20.1 1.9-1.9 34.2-31.4 34.8-34 .1-.3.1-.6-.2-.8-.3-.2-.8-.1-1.1-.1-1 .2-16.1 10.2-45.4 30-4.3 3-8.2 4.4-11.7 4.3-3.9-.1-11.3-2.2-16.8-4-6.8-2.2-12.1-3.4-11.7-7.1.2-2 2.8-4 7.5-6z" fill="white"/>
    </svg>
  );
}

// ── types ────────────────────────────────────────────────────────────────────

interface Channel {
  id: number;
  url: string;
  addedBy: string;
  addedAt: string;
  status: "pending" | "processing" | "completed";
  assignedTo: string | null;
}

// ── milestone checker ────────────────────────────────────────────────────────

const MILESTONES = new Set([25, 50, 75, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000]);

function checkMilestone(prevCount: number, newCount: number): number | null {
  for (const m of MILESTONES) {
    if (prevCount < m && newCount >= m) return m;
  }
  return null;
}

function fireConfetti() {
  const duration = 2000;
  const end = Date.now() + duration;
  const colors = ["#2AABEE", "#229ED9", "#1a1a18", "#888780"];

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 80,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 80,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function getRelativeTime(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── login ─────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (email: string) => void }) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const data = await api.login(email, password);
      onLogin(data.user.email);
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[360px]"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center mb-8"
        >
          <TelegramLogo size={40} />
        </motion.div>

        <div className="text-center mb-7">
          <h1 className="text-[18px] font-medium text-[#1a1a18] mb-1">Sign in</h1>
          <p className="text-[13px] text-muted-foreground">Private access only</p>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="bg-card border border-border rounded-2xl p-6 space-y-4"
        >
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-2 text-[13px] text-[#791F1F] bg-[#FCEBEB] border border-[#F7C1C1] rounded-lg px-3 py-2.5 overflow-hidden"
              >
                <AlertCircle size={14} className="flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          <div>
            <label className="block text-[12px] font-medium text-[#5F5E5A] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="you@example.com"
              autoFocus
              className="w-full border border-border rounded-lg px-3 py-2.5 text-[14px] text-[#1a1a18] bg-[#fafaf8] placeholder:text-muted-foreground focus:outline-none focus:border-[#1a1a18] focus:ring-1 focus:ring-[#1a1a18]/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#5F5E5A] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="••••••••"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-[14px] text-[#1a1a18] bg-[#fafaf8] placeholder:text-muted-foreground focus:outline-none focus:border-[#1a1a18] focus:ring-1 focus:ring-[#1a1a18]/10 transition-all"
            />
          </div>
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full bg-[#1a1a18] text-white rounded-lg py-2.5 text-[14px] font-medium hover:bg-[#2d2d2a] transition-colors mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </motion.button>
        </motion.form>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-center text-[12px] text-muted-foreground mt-4"
        >
          No sign-up. Contact your team member to create an account.
        </motion.p>
      </motion.div>
    </div>
  );
}

// ── dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ user, onLogout }: { user: string; onLogout: () => void }) {
  const [channels, setChannels]           = useState<Channel[]>([]);
  const [loading, setLoading]             = useState(true);
  const [input, setInput]                 = useState("");
  const [searchQuery, setSearchQuery]     = useState("");
  const [showSearch, setShowSearch]       = useState(false);
  const inputRef                          = useRef<HTMLInputElement>(null);
  const searchRef                         = useRef<HTMLInputElement>(null);
  const [totalChannels, setTotalChannels] = useState(0);

  const GOAL = 1000;

  // Load channels on mount
  useEffect(() => {
    loadChannels();
  }, []);

  async function loadChannels() {
    try {
      const data = await api.getChannels();
      setChannels(data.channels);
      setTotalChannels(data.channels.length);
    } catch (err: any) {
      toast.error("Failed to load channels", {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  const [currentTab, setCurrentTab] = useState<"all" | "claimed" | "completed">("all");

  const needed    = Math.max(0, GOAL - totalChannels);
  const pct       = Math.min(100, Math.round((totalChannels / GOAL) * 100));

  let displayedChannels = channels;

  // 1. Tab filter
  if (currentTab === "claimed") {
    displayedChannels = displayedChannels.filter((c) => c.status === "processing" && c.assignedTo === user);
  } else if (currentTab === "completed") {
    displayedChannels = displayedChannels.filter((c) => c.status === "completed");
  }

  // 2. Search
  if (searchQuery.trim()) {
    displayedChannels = displayedChannels.filter((c) =>
      c.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.addedBy.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // 3. Sort (Pending -> Processing -> Completed, then by Date)
  const statusOrder = { pending: 1, processing: 2, completed: 3 };
  displayedChannels.sort((a, b) => {
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
  });

  async function handleUpdateStatus(id: number, newStatus: string) {
    const ch = channels.find((c) => c.id === id);
    if (!ch) return;

    const prevChannels = [...channels];
    setChannels((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: newStatus as any,
              assignedTo: newStatus === "processing" ? user : newStatus === "pending" ? null : c.assignedTo,
            }
          : c
      )
    );

    try {
      await api.updateChannelStatus(id, newStatus);
      toast.success("Status updated");
    } catch (err: any) {
      setChannels(prevChannels);
      toast.error("Failed to update status", { description: err.message });
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const url = input.trim();
    if (!url) return;

    try {
      const data = await api.addChannel(url);

      // Reload channels to get fresh server data
      await loadChannels();

      setInput("");

      const milestone = checkMilestone(totalChannels, data.total ?? totalChannels + 1);
      setTotalChannels(data.total ?? totalChannels + 1);

      toast.success("Channel added", {
        description: (
          <span>
            <strong>{url.toLowerCase()}</strong> has been added.
            {milestone && <span className="block mt-1 font-medium">🎉 {milestone} channels reached!</span>}
          </span>
        ),
        icon: <CheckCircle size={16} />,
        duration: 3000,
      });

      if (milestone) fireConfetti();
    } catch (err: any) {
      if (err.code === "duplicate") {
        toast.error("Duplicate channel", {
          description: err.message,
          icon: <AlertCircle size={16} />,
          duration: 4000,
        });
      } else {
        toast.error("Failed to add channel", {
          description: err.message,
        });
      }
    }
  }

  async function handleDelete(id: number) {
    const ch = channels.find((c) => c.id === id);
    if (!ch) return;

    // Optimistic removal
    setChannels((prev) => prev.filter((c) => c.id !== id));

    toast("Channel removed", {
      description: `${ch.url} was removed.`,
      icon: <Trash2 size={16} />,
      action: {
        label: "Undo",
        onClick: async () => {
          // Re-add via API
          try {
            await api.addChannel(ch.url);
            await loadChannels();
            toast.success("Channel restored", { icon: <CheckCircle size={16} /> });
          } catch {
            toast.error("Could not restore channel");
          }
        },
      },
      duration: 5000,
    });

    try {
      const data = await api.deleteChannel(id);
      setTotalChannels(data.total);
    } catch {
      // Revert on failure
      setChannels((prev) => [ch, ...prev]);
      toast.error("Failed to delete channel");
    }
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(`https://${url}`).then(() => {
      toast.success("Copied to clipboard", {
        description: `https://${url}`,
        icon: <Copy size={16} />,
        duration: 2000,
      });
    });
  }

  async function handleExportTxt() {
    try {
      const { blob, filename } = await api.exportTxt();
      triggerDownload(blob, filename);
      toast.success("Downloaded .txt", {
        description: `${totalChannels} channels exported.`,
        icon: <FileText size={16} />,
        duration: 2000,
      });
    } catch (err: any) {
      toast.error("Download failed", { description: err.message });
    }
  }

  async function handleExportJsonl() {
    try {
      const { blob, filename } = await api.exportJsonl();
      triggerDownload(blob, filename);
      toast.success("Downloaded .jsonl", {
        description: `${totalChannels} channels exported.`,
        icon: <FileCode size={16} />,
        duration: 2000,
      });
    } catch (err: any) {
      toast.error("Download failed", { description: err.message });
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (input) setInput("");
        if (searchQuery) setSearchQuery("");
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [input, searchQuery]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleLogout() {
    api.logout();
    onLogout();
  }

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: "13px",
            borderRadius: "12px",
            border: "0.5px solid #dddbd3",
            background: "#fff",
            color: "#1a1a18",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          },
          duration: 3000,
        }}
      />

      {/* nav */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-card/90"
      >
        <div className="max-w-5xl mx-auto px-5 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TelegramLogo size={24} />
            <span className="text-[14px] font-medium text-[#1a1a18]">Channel collector</span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowSearch(!showSearch);
                if (!showSearch) setTimeout(() => searchRef.current?.focus(), 50);
                else setSearchQuery("");
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${
                showSearch ? "bg-secondary text-[#1a1a18]" : "text-muted-foreground hover:text-[#1a1a18] hover:bg-secondary/50"
              }`}
              title="Search channels (⌘K)"
            >
              <Search size={13} />
              <span className="hidden sm:inline">Search</span>
            </motion.button>
            <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-muted-foreground ml-1">
              <Users size={12} />
              <span>Signed in as <strong className="text-[#3d3d3a] font-medium">{user}</strong></span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-[#1a1a18] transition-colors ml-1"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign out</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-5xl mx-auto px-5 py-7">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            >
              <TelegramLogo size={32} />
            </motion.div>
          </div>
        ) : (
          <DashboardTab
            user={user}
            channels={displayedChannels}
            allChannels={channels}
            totalChannels={totalChannels}
            needed={needed}
            pct={pct}
            GOAL={GOAL}
            input={input}
            setInput={setInput}
            inputRef={inputRef}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showSearch={showSearch}
            searchRef={searchRef}
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            handleAdd={handleAdd}
            handleDelete={handleDelete}
            handleCopy={handleCopy}
            handleUpdateStatus={handleUpdateStatus}
            handleExportTxt={handleExportTxt}
            handleExportJsonl={handleExportJsonl}
          />
        )}
      </main>
    </div>
  );
}

// ── dashboard tab ─────────────────────────────────────────────────────────────

function DashboardTab({
  user, channels, allChannels, totalChannels, needed, pct, GOAL,
  input, setInput, inputRef,
  searchQuery, setSearchQuery, showSearch, searchRef,
  currentTab, setCurrentTab,
  handleAdd, handleDelete, handleCopy, handleUpdateStatus,
  handleExportTxt, handleExportJsonl,
}: {
  user: string;
  channels: Channel[];
  allChannels: Channel[];
  totalChannels: number;
  needed: number;
  pct: number;
  GOAL: number;
  input: string;
  setInput: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  showSearch: boolean;
  searchRef: React.RefObject<HTMLInputElement | null>;
  currentTab: "all" | "claimed" | "completed";
  setCurrentTab: (v: "all" | "claimed" | "completed") => void;
  handleAdd: (e: React.FormEvent) => void;
  handleDelete: (id: number) => void;
  handleCopy: (url: string) => void;
  handleUpdateStatus: (id: number, status: string) => void;
  handleExportTxt: () => void;
  handleExportJsonl: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
    >
      {/* stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { val: totalChannels.toLocaleString(), lbl: "Channels collected", icon: <Users size={14} /> },
          { val: needed.toLocaleString(),        lbl: "Still needed", icon: <Sparkles size={14} /> },
          { val: `${pct}%`,                      lbl: `Progress to ${GOAL.toLocaleString()}`, icon: <CheckCircle size={14} /> },
          { val: GOAL.toLocaleString(),           lbl: "Goal", icon: <Download size={14} /> },
        ].map((s, i) => (
          <motion.div
            key={s.lbl}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
            className="bg-card border border-border rounded-2xl px-4 py-3.5 transition-shadow"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-muted-foreground">{s.icon}</span>
              <div className="text-[22px] font-medium text-[#1a1a18] leading-none">{s.val}</div>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{s.lbl}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="bg-card border border-border rounded-2xl px-5 py-4"
      >
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[12px] font-medium text-[#5F5E5A]">Collection progress</span>
          <span className="text-[12px] text-muted-foreground">{totalChannels.toLocaleString()} / {GOAL.toLocaleString()}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#1a1a18] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          />
        </div>
      </motion.div>

      {/* add channel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="text-[13px] font-medium text-[#1a1a18] mb-3">Add a channel</div>
        <form onSubmit={handleAdd} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://t.me/channelname or @channelname"
              className="w-full border border-border rounded-lg px-3 py-2.5 pr-8 text-[13px] bg-[#fafaf8] placeholder:text-muted-foreground focus:outline-none focus:border-[#1a1a18] focus:ring-1 focus:ring-[#1a1a18]/10 transition-all"
            />
            {input && (
              <button
                type="button"
                onClick={() => setInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#1a1a18] transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            disabled={!input.trim()}
            className="flex items-center gap-1.5 bg-[#1a1a18] text-white text-[13px] font-medium rounded-lg px-4 whitespace-nowrap hover:bg-[#2d2d2a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={14} /> Add channel
          </motion.button>
        </form>
      </motion.div>

      {/* search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border rounded-2xl px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Search size={14} className="text-muted-foreground flex-shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by channel name or added by..."
                  className="flex-1 border-none bg-transparent text-[13px] text-[#1a1a18] placeholder:text-muted-foreground focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-muted-foreground hover:text-[#1a1a18] transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex text-[11px] text-muted-foreground bg-secondary border border-border rounded-md px-1.5 py-0.5 font-mono">
                  Esc
                </kbd>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* channel list tabs */}
      <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg w-fit">
        {[
          { id: "all", label: "All channels" },
          { id: "claimed", label: "My claimed" },
          { id: "completed", label: "Completed" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id as any)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
              currentTab === tab.id
                ? "bg-white text-[#1a1a18] shadow-sm"
                : "text-muted-foreground hover:text-[#1a1a18] hover:bg-white/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* channel list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="bg-card border border-border rounded-2xl overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#1a1a18]">
            {currentTab === "all" ? "Channel list" : currentTab === "claimed" ? "My claimed channels" : "Completed channels"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {channels.length} {channels.length === 1 ? "entry" : "entries"}
            {channels.length !== allChannels.length && currentTab === "all" && (
              <span className="ml-1">(filtered from {allChannels.length})</span>
            )}
          </span>
        </div>

        {channels.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 px-5"
          >
            <Search size={32} className="text-muted-foreground/40 mb-3" />
            <p className="text-[14px] text-muted-foreground font-medium">
              {allChannels.length === 0 ? "No channels yet" : "No channels match your search"}
            </p>
            <p className="text-[12px] text-muted-foreground/60 mt-1">
              {allChannels.length === 0
                ? "Add your first channel above to get started."
                : "Try a different search term or clear the search."}
            </p>
          </motion.div>
        ) : (
          <>
            {/* desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Channel URL", "Added by", "Date added", "Status", ""].map((h) => (
                      <th key={h} className="px-5 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-[0.06em]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {channels.map((c) => (
                      <motion.tr
                        key={c.id}
                        layout
                        initial={{ opacity: 0, x: -10, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: "auto" }}
                        exit={{ opacity: 0, x: 10, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="border-b border-[#f0ede6] last:border-0 hover:bg-secondary/40 transition-colors group"
                      >
                        <td className="px-5 py-3">
                          <button
                            onClick={() => handleCopy(c.url)}
                            className="flex items-center gap-1.5 text-[13px] text-[#185FA5] hover:text-[#0f3d6e] transition-colors group/copy"
                            title="Copy URL to clipboard"
                          >
                            <span>{c.url}</span>
                            <Copy size={12} className="text-muted-foreground/40 group-hover/copy:text-muted-foreground transition-colors flex-shrink-0" />
                          </button>
                        </td>
                        <td className="px-5 py-3 text-[13px] text-[#3d3d3a]">{c.addedBy}</td>
                        <td className="px-5 py-3">
                          <span className="text-[13px] text-[#3d3d3a]" title={formatDate(c.addedAt)}>
                            {getRelativeTime(c.addedAt)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {c.status === "pending" && (
                            <button
                              onClick={() => handleUpdateStatus(c.id, "processing")}
                              className="text-[11px] bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-full px-2.5 py-0.5 font-medium transition-colors"
                            >
                              Claim
                            </button>
                          )}
                          {c.status === "processing" && c.assignedTo === user && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleUpdateStatus(c.id, "completed")}
                                className="text-[11px] bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 rounded-full px-2.5 py-0.5 font-medium transition-colors"
                              >
                                Mark Done
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(c.id, "pending")}
                                className="text-[11px] text-muted-foreground hover:text-[#1a1a18] underline transition-colors"
                              >
                                Unclaim
                              </button>
                            </div>
                          )}
                          {c.status === "processing" && c.assignedTo !== user && (
                            <span className="inline-block text-[11px] rounded-full px-2.5 py-0.5 bg-[#E6F1FB] text-[#0C447C]">
                              Claimed by {c.assignedTo?.split('@')[0]}
                            </span>
                          )}
                          {c.status === "completed" && (
                            <span className="inline-flex items-center gap-1 text-[11px] rounded-full px-2.5 py-0.5 bg-[#E1F5EE] text-[#085041]">
                              <CheckCircle size={10} /> Completed
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(c.id)}
                            className="text-muted-foreground/40 hover:text-[#A32D2D] transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove channel"
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* mobile cards */}
            <div className="sm:hidden divide-y divide-[#f0ede6]">
              <AnimatePresence mode="popLayout">
                {channels.map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="px-5 py-3.5 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => handleCopy(c.url)}
                          className="flex items-center gap-1.5 text-[13px] text-[#185FA5] hover:text-[#0f3d6e] transition-colors group/copy"
                          title="Copy URL"
                        >
                          <span className="truncate">{c.url}</span>
                          <Copy size={12} className="text-muted-foreground/40 group-hover/copy:text-muted-foreground transition-colors flex-shrink-0" />
                        </button>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(c.id)}
                        className="text-muted-foreground/40 hover:text-[#A32D2D] transition-colors flex-shrink-0"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-muted-foreground mt-1">
                      <span>{c.addedBy}</span>
                      <span>·</span>
                      <span title={formatDate(c.addedAt)}>{getRelativeTime(c.addedAt)}</span>
                      <div className="ml-auto flex items-center gap-2">
                        {c.status === "pending" && (
                          <button
                            onClick={() => handleUpdateStatus(c.id, "processing")}
                            className="text-[11px] bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-full px-2.5 py-0.5 font-medium transition-colors"
                          >
                            Claim
                          </button>
                        )}
                        {c.status === "processing" && c.assignedTo === user && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleUpdateStatus(c.id, "completed")}
                              className="text-[11px] bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 rounded-full px-2.5 py-0.5 font-medium transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        )}
                        {c.status === "processing" && c.assignedTo !== user && (
                          <span className="inline-block text-[11px] rounded-full px-2.5 py-0.5 bg-[#E6F1FB] text-[#0C447C]">
                            {c.assignedTo?.split('@')[0]}
                          </span>
                        )}
                        {c.status === "completed" && (
                          <span className="inline-block text-[11px] rounded-full px-2.5 py-0.5 bg-[#E1F5EE] text-[#085041]">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>

      {/* download */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="bg-card border border-border rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-1">
          <Download size={14} className="text-muted-foreground" />
          <div className="text-[13px] font-medium text-[#1a1a18]">Download backup</div>
        </div>
        <p className="text-[12px] text-muted-foreground mb-3 ml-6">
          Snapshot of the current list — filename includes count and today&apos;s date.
        </p>
        <div className="flex flex-wrap gap-2 ml-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExportTxt}
            disabled={totalChannels === 0}
            className="flex items-center gap-2 border border-border rounded-lg px-4 py-2 text-[13px] text-[#3d3d3a] bg-card hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText size={14} className="text-muted-foreground" /> Download .txt
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExportJsonl}
            disabled={totalChannels === 0}
            className="flex items-center gap-2 border border-border rounded-lg px-4 py-2 text-[13px] text-[#3d3d3a] bg-card hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileCode size={14} className="text-muted-foreground" /> Download .jsonl
          </motion.button>
        </div>
      </motion.div>

    </motion.div>
  );
}

// ── root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<string | null>(null);
  const [initialising, setInitialising] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = api.loadToken();
    if (token) {
      // Try loading channels to verify the token is still valid
      api.getChannels()
        .then(() => setUser(api.userEmail || "authenticated"))
        .catch(() => {
          // Token expired, stay on login
          api.setToken(null);
        })
        .finally(() => setInitialising(false));
    } else {
      setInitialising(false);
    }
  }, []);

  if (initialising) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        >
          <TelegramLogo size={40} />
        </motion.div>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={(email) => setUser(email)} />;
  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
