import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import OnlineUsersBadge from "../components/OnlineUsersBadge";
import ThemeToggle from "../components/ThemeToggle";
import { Badge, GlassCard } from "../components/ui";
import SelectMenu from "../components/SelectMenu";
import { Skeleton } from "../components/Skeleton";

const COUNTRIES: Array<{ code: string; name: string }> = [
  { code: "all", name: "All countries" },
  { code: "us", name: "United States" },
  { code: "gb", name: "United Kingdom" },
  { code: "ca", name: "Canada" },
  { code: "au", name: "Australia" },
  { code: "in", name: "India" },
  { code: "de", name: "Germany" },
  { code: "fr", name: "France" },
  { code: "es", name: "Spain" },
  { code: "br", name: "Brazil" },
];

type Gender = "all" | "male" | "female" | "couple";

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: "all", label: "✨ All" },
  { value: "male", label: "👨 Male" },
  { value: "female", label: "👩 Female" },
  { value: "couple", label: "🧑‍🤝‍🧑 Couple" },
];

const FEATURES = [
  { icon: "⚡", title: "Instant matching", desc: "Get paired in seconds with smart queue matching." },
  { icon: "🌍", title: "Global reach", desc: "Filter by country and connect worldwide." },
  { icon: "🔒", title: "Privacy first", desc: "No accounts required. Anonymous by design." },
  { icon: "💬", title: "Live chat", desc: "Text and video side-by-side in one session." },
];

function softClick() {
  try {
    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 520;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    const now = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.03, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    o.stop(now + 0.09);
    o.onended = () => ctx.close();
  } catch {
    // ignore
  }
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function Home() {
  const nav = useNavigate();
  const [country, setCountry] = useState("all");
  const [gender, setGender] = useState<Gender>("all");

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("country", country);
    sp.set("gender", gender);
    return sp.toString();
  }, [country, gender]);

  return (
    <div className="page-enter min-h-screen">
      <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--rt-card-border))]/50 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <img
            src="/random-talk-logo.png"
            alt="RandomTalk"
            className="h-11 w-auto rounded-2xl shadow-[0_20px_60px_rgba(34,211,238,0.22)] sm:h-12"
          />
          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-[rgb(var(--rt-fg))]">RandomTalk</div>
            <div className="text-xs text-[rgb(var(--rt-muted2))]">Video chat, reimagined</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <OnlineUsersBadge />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <motion.section {...fadeUp} transition={{ duration: 0.45 }} className="w-full space-y-10">
          {/* Hero */}
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge tone="emerald">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Live now
                </Badge>
                <Badge tone="sky">Free · No signup</Badge>
              </div>

              <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.25rem]">
                Meet someone new{" "}
                <span className="bg-gradient-to-r from-[rgb(var(--rt-accent-cyan))] via-[rgb(var(--rt-accent-coral))] to-[rgb(var(--rt-accent-amber))] bg-clip-text text-transparent">
                  face to face
                </span>
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-[rgb(var(--rt-muted))] sm:text-lg">
                A modern random video chat platform. Pick your preferences, hit Start, and connect with people around the world in real time.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {FEATURES.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className="rounded-2xl border border-[rgb(var(--rt-card-border))] bg-[rgb(var(--rt-card-bg))] p-3 sm:p-4"
                  >
                    <div className="mb-2 text-lg">{f.icon}</div>
                    <div className="text-xs font-semibold text-[rgb(var(--rt-fg))] sm:text-sm">{f.title}</div>
                    <div className="mt-1 hidden text-[11px] text-[rgb(var(--rt-muted2))] sm:block">{f.desc}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Preview mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="relative"
            >
              <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-[rgb(var(--rt-accent-cyan)/0.2)] via-transparent to-[rgb(var(--rt-accent-coral)/0.15)] blur-3xl" />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-[rgb(var(--rt-video-border))] bg-[rgb(var(--rt-video-bg))] p-3 shadow-[var(--rt-video-shadow)] sm:p-4">
                <div className="mb-3 flex items-center justify-between px-1">
                  <Badge tone="neutral" className="bg-black/40">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    Live preview
                  </Badge>
                  <span className="text-[10px] text-[rgb(var(--rt-muted2))]">HD · Encrypted</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/8 bg-black/50">
                    <Skeleton className="absolute inset-0 rounded-none" />
                    <div className="absolute inset-0 grid place-items-center">
                      <span className="rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[11px] text-white/70">You</span>
                    </div>
                  </div>
                  <div className="relative aspect-video overflow-hidden rounded-2xl border border-[rgb(var(--rt-accent-cyan)/0.2)] bg-black/50">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(34,211,238,0.12),transparent_60%)]" />
                    <div className="absolute inset-0 grid place-items-center">
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex flex-col items-center gap-2"
                      >
                        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[rgb(var(--rt-accent-cyan))]" />
                        <span className="text-[11px] text-white/70">Finding partner…</span>
                      </motion.div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-center gap-2">
                  {["Mute", "Camera", "Next", "Leave"].map((label) => (
                    <div
                      key={label}
                      className="h-9 min-w-[36px] rounded-xl border border-white/8 bg-white/5 px-2 text-[9px] font-semibold uppercase tracking-wide text-white/50 sm:min-w-[52px] sm:text-[10px]"
                    >
                      <div className="flex h-full items-center justify-center">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Start card */}
          <GlassCard className="!transform-none p-6 hover:!translate-y-0 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-end">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready to connect?</h2>
                <p className="mt-2 max-w-lg text-sm text-[rgb(var(--rt-muted))]">
                  Set your preferences below. You can skip to the next person anytime.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                  <SelectMenu
                    label="Country"
                    value={country}
                    onChange={setCountry}
                    leadingIcon="🌍"
                    searchable
                    items={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
                  />
                  <SelectMenu
                    label="I am"
                    value={gender}
                    onChange={(v) => setGender(v as Gender)}
                    leadingIcon="👤"
                    items={GENDER_OPTIONS}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    softClick();
                    nav(`/chat?${query}`);
                  }}
                  className="group relative isolate h-14 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[rgb(var(--rt-accent-cyan))] via-[rgb(var(--rt-accent-coral))] to-[rgb(var(--rt-accent-amber))] text-base font-bold text-white shadow-[0_20px_80px_rgba(34,211,238,0.3)] ring-1 ring-white/15 transition focus:outline-none focus:ring-4 focus:ring-[rgb(var(--rt-ring-strong))]"
                >
                  <span className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="absolute -left-1/3 top-0 h-full w-1/2 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/30 to-transparent motion-safe:animate-[shimmer_1.2s_ease-in-out_infinite]" />
                  </span>
                  <span className="relative inline-flex w-full items-center justify-center gap-2">
                    Start video chat
                    <span className="text-lg">→</span>
                  </span>
                </motion.button>
                <p className="text-center text-xs leading-relaxed text-[rgb(var(--rt-muted2))] lg:text-left">
                  By starting, you agree to be respectful. No personal info sharing.
                </p>
                <p className="text-center text-[11px] leading-relaxed text-[rgb(var(--rt-muted2))]/80 lg:text-left">
                  Local test: open two tabs with All / All filters, or use Chrome + Edge.
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Safety */}
          <motion.div {...fadeUp} transition={{ delay: 0.2, duration: 0.4 }}>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: "🔒", title: "Stay anonymous", desc: "Never share passwords, OTPs, or addresses." },
                { icon: "⏭️", title: "Skip anytime", desc: "Press Next if the conversation isn't right." },
                { icon: "🎧", title: "Use headphones", desc: "Clearer audio and less echo for both sides." },
              ].map((item) => (
                <GlassCard key={item.title} className="!transform-none p-5 hover:!translate-y-0">
                  <div className="mb-3 text-xl">{item.icon}</div>
                  <div className="font-semibold text-[rgb(var(--rt-fg))]">{item.title}</div>
                  <p className="mt-1.5 text-sm text-[rgb(var(--rt-muted2))]">{item.desc}</p>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        </motion.section>

        <footer className="mt-12 border-t border-[rgb(var(--rt-card-border))]/50 pt-8 text-center text-xs text-[rgb(var(--rt-muted2))]">
          RandomTalk · Free peer-to-peer video chat · Built for a global audience
        </footer>
      </main>
    </div>
  );
}

