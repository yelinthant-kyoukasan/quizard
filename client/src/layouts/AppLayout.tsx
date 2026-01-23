import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "../context/useAuth"

function Chip({ icon, label }: { icon: string; label: string | number }) {
    return (
        <div className="flex items-center gap-2 rounded-full bg-white/90 border border-slate-200 px-3 py-1 shadow-sm">
            <span className="text-sm">{icon}</span>
            <span className="text-sm font-semibold text-slate-800">{label}</span>
        </div>
    )
}

const base =
    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl text-xs font-semibold transition"
const inactive = "text-slate-500 hover:text-slate-800"
const active = "text-indigo-700 bg-indigo-50 border border-indigo-100 shadow-sm"

const Item = ({
    to,
    icon,
    label,
}: {
    to: string
    icon: string
    label: string
}) => (
    <NavLink
        to={to}
        className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
        end={to === "/"}
    >
        <div className="text-lg leading-none">{icon}</div>
        <div className="leading-none">{label}</div>
    </NavLink>
)

function BottomNav() {

    return (
        <div className="fixed bottom-4 left-0 right-0 z-40">
            <div className="mx-auto max-w-md md:max-w-3xl px-5">
                <nav className="w-full rounded-3xl bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg px-2 py-2 flex items-center justify-between">
                    <Item to="/" icon="🏠" label="Home" />
                    <Item to="/learn" icon="📚" label="Learn" />
                    <Item to="/battles" icon="⚔️" label="Battles" />
                    <Item to="/friends" icon="🤝" label="Friends" />
                    <Item to="/leaderboard" icon="🏆" label="Ranks" />
                    <Item to="/profile" icon="👤" label="Profile" />
                </nav>
            </div>
        </div>
    )
}

export default function AppLayout() {
    const navigate = useNavigate()
    const { user } = useAuth()

    // Safe placeholders until backend stats exist
    const xp = (user)?.xp ?? 0
    const streak = (user)?.streakDays ?? 0
    const lives = (user)?.lives ?? 5

    return (
        <div className="min-h-screen w-full relative bg-gradient-to-b from-slate-50 via-white to-indigo-50">
            {/* Background layer only (clipped) — does NOT break sticky header */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[900px] rounded-full bg-indigo-200/45 blur-3xl" />
                <div className="absolute top-24 -left-52 h-96 w-96 rounded-full bg-violet-200/40 blur-3xl" />
                <div className="absolute top-40 -right-56 h-96 w-96 rounded-full bg-sky-200/35 blur-3xl" />
                <div className="absolute -bottom-56 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full bg-indigo-200/25 blur-3xl" />
            </div>

            {/* Sticky header */}
            <header className="sticky top-0 z-50">
                <div className="bg-white/85 backdrop-blur-md border-b border-slate-200/70 shadow-[0_1px_0_rgba(15,23,42,0.06)]">
                    <div className="mx-auto max-w-md md:max-w-3xl px-5 py-3 flex items-center justify-between">
                        {/* Brand */}
                        <button
                            onClick={() => navigate("/")}
                            className="flex items-center gap-3"
                            title="Home"
                        >
                            {/* Replace this Q with your logo later */}
                            <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white grid place-items-center font-black">
                                Q
                            </div>

                            <div className="leading-tight">
                                <div className="text-sm font-extrabold text-slate-900 leading-none">
                                    Quizard
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    O-Level Study Mode
                                </div>
                            </div>
                        </button>

                        {/* Stats chips */}
                        <div className="flex items-center gap-2">
                            <Chip icon="🔥" label={streak} />
                            <Chip icon="🏆" label={xp} />
                            <Chip icon="❤️" label={lives} />
                        </div>
                    </div>
                </div>
            </header>

            {/* Page content */}
            <main className="relative">
                <div className="mx-auto px-5 pt-6 pb-32 max-w-md md:max-w-3xl">
                    <Outlet />
                </div>
            </main>

            {/* Bottom nav (you said overlap is fine; we leave it) */}
            <BottomNav />
        </div>
    )
}
