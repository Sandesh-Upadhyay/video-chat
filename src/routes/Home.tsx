import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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
            <div className="text-xs text-white/60">OmeTV-style random video chat</div>
          </div>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <a className="text-sm text-white/70 hover:text-white" href="https://ome.tv/rules" target="_blank" rel="noreferrer">
            Rules
          </a>
          <a className="text-sm text-white/70 hover:text-white" href="https://ome.tv/" target="_blank" rel="noreferrer">
            OmeTV
          </a>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-8 px-6 pb-14 pt-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Online</span>
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Meet someone new in{" "}
            <span className="bg-gradient-to-r from-sky-300 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
              random video chat
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            Choose a country and a preference, then press <span className="font-semibold text-white">Start</span>. You can
            skip anytime with <span className="font-semibold text-white">Next</span>.
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-medium text-white/70">Country</span>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-11 rounded-2xl border border-white/10 bg-ink-900/60 px-4 text-sm text-white outline-none ring-0 transition focus:border-sky-400/40 focus:ring-4 focus:ring-sky-500/10"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-2">
              <span className="text-xs font-medium text-white/70">I am</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([
                  ["all", "All"],
                  ["male", "Male"],
                  ["female", "Female"],
                  ["couple", "Couple"]
                ] as const).map(([v, label]) => {
                  const active = gender === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setGender(v)}
                      className={[
                        "h-11 rounded-2xl border px-3 text-sm transition",
                        active
                          ? "border-sky-400/40 bg-sky-500/15 text-white shadow-[0_10px_40px_rgba(56,189,248,0.18)]"
                          : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => nav(`/chat?${query}`)}
              className="h-12 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-600 px-6 text-sm font-semibold shadow-[0_20px_70px_rgba(59,130,246,0.35)] transition hover:brightness-110 active:brightness-95"
            >
              Start
            </button>
            <div className="text-xs text-white/60">
              By pressing “Start”, you agree to OmeTV-style safety rules. Keep your face visible and be respectful.
            </div>
          </div>
        </section>

        <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Safety reminder</div>
            <div className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-200">Be safe</div>
          </div>
          <ul className="mt-4 grid gap-3 text-sm text-white/70">
            <li className="rounded-2xl border border-white/10 bg-white/5 p-3">
              Never share personal info (address, passwords, OTPs).
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/5 p-3">
              If someone is inappropriate, press <span className="font-semibold text-white">Next</span> or close the tab.
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/5 p-3">Use good lighting and headphones for the best experience.</li>
          </ul>
        </aside>
      </main>
    </div>
  );
}

