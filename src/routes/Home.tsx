import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import ThemeToggle from "../components/ThemeToggle";
import { Badge, GlassCard, PillToggle } from "../components/ui";

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
  { code: "br", name: "Brazil" }
];

type Gender = "all" | "male" | "female" | "couple";

function softClick() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
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
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_20px_60px_rgba(59,130,246,0.35)]" />
          <div className="leading-tight">
            <div className="text-lg font-semibold tracking-tight">RandomTalk</div>
            <div className="text-xs text-white/60">Random video chat</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-14 pt-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="space-y-6"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="emerald">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Live
            </Badge>
            <Badge tone="sky">👥 2,000+ users online</Badge>
            <Badge tone="sky">🌎 40+ countries</Badge>
            <Badge tone="neutral">🔒 Safe & private</Badge>
          </div>

          <GlassCard className="p-6 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <h1 className="text-4xl font-semibold leading-[1.06] tracking-tight sm:text-5xl">
                  Connect instantly with strangers worldwide —{" "}
                  <span className="bg-gradient-to-r from-sky-300 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                    face-to-face in seconds
                  </span>
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
                  Choose your preferences, press Start, and get matched instantly. Skip anytime with Next.
                </p>

                <div className="mt-5 grid gap-2 text-sm text-white/75 sm:grid-cols-3">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    🌍 <span className="font-medium text-white/90">Thousands online</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    ⚡ <span className="font-medium text-white/90">Instant match</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    🔒 <span className="font-medium text-white/90">Private by default</span>
                  </div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-xs font-medium text-white/70">Country</span>
                    <div className="relative">
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-ink-900/60 px-4 pr-10 text-sm text-white outline-none ring-0 transition focus:border-sky-300/25 focus:ring-4 focus:ring-sky-500/10"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-white/50">
                        ▾
                      </div>
                    </div>
                  </label>

                  <div className="grid gap-2">
                    <span className="text-xs font-medium text-white/70">I am</span>
                    <PillToggle
                      value={gender}
                      onChange={(v) => setGender(v as Gender)}
                      items={[
                        { value: "all", label: "All", icon: "✨" },
                        { value: "male", label: "Male", icon: "👨" },
                        { value: "female", label: "Female", icon: "👩" },
                        { value: "couple", label: "Couple", icon: "🧑‍🤝‍🧑" }
                      ]}
                    />
                  </div>
                </div>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      softClick();
                      nav(`/chat?${query}`);
                    }}
                    className="relative h-12 overflow-hidden rounded-2xl bg-gradient-to-r from-sky-400 to-blue-600 px-6 text-sm font-semibold shadow-[0_20px_90px_rgba(59,130,246,0.38)] transition"
                  >
                    <span className="relative z-10 inline-flex items-center gap-2">
                      Start <span className="text-base">🚀</span>
                    </span>
                    <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100">
                      <span className="absolute -inset-20 bg-[radial-gradient(circle,rgba(255,255,255,0.35),transparent_55%)]" />
                    </span>
                  </motion.button>

                  <div className="text-xs text-white/60">
                    By pressing “Start”, you agree to our safety rules. Keep your face visible and be respectful.
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 rounded-[28px] bg-gradient-to-br from-sky-500/20 via-indigo-500/10 to-fuchsia-500/10 blur-2xl" />
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/35 p-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <Badge tone="neutral" className="bg-black/35">
                      <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-sky-400" />
                      Connecting…
                    </Badge>
                    <div className="text-xs text-white/55">Preview</div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(99,102,241,0.16),transparent_55%)]" />
                      <div className="absolute inset-0 opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent)]">
                        <div className="h-full w-full animate-[floatGlow_6s_ease-in-out_infinite] bg-[radial-gradient(circle_at_40%_40%,rgba(255,255,255,0.18),transparent_55%)]" />
                      </div>
                      <div className="absolute inset-0 grid place-items-center">
                        <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-2 text-sm text-white/80">
                          Finding a partner…
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                        <div className="font-semibold text-white/85">Step 1</div>
                        Choose preferences
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                        <div className="font-semibold text-white/85">Step 2</div>
                        Click Start
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                        <div className="font-semibold text-white/85">Step 3</div>
                        Start chatting
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.35, ease: "easeOut" }}
          >
            <GlassCard className="p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Safety first</div>
                <Badge tone="amber">Be kind</Badge>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-white/75 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 text-base">🔒</div>
                  <div className="font-semibold text-white/90">No personal info</div>
                  <div className="mt-1 text-xs text-white/60">Don’t share passwords, OTPs, or addresses.</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 text-base">🚫</div>
                  <div className="font-semibold text-white/90">Skip anytime</div>
                  <div className="mt-1 text-xs text-white/60">Press Next if the vibe is off.</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 text-base">🎧</div>
                  <div className="font-semibold text-white/90">Use headphones</div>
                  <div className="mt-1 text-xs text-white/60">Better audio and fewer echoes.</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </motion.section>
      </main>
    </div>
  );
}

