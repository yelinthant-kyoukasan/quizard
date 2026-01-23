import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { loginUser, registerUser } from "../services/authApi";
import logo from "../assets/logo.png";

type Mode = "login" | "register";

export default function AuthPage() {
    const navigate = useNavigate();
    const { refreshMe } = useAuth();

    const [mode, setMode] = useState<Mode>("login");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // login
    const [emailOrUsername, setEmailOrUsername] = useState("");
    const [password, setPassword] = useState("");

    // register
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");

    const title = useMemo(() => {
        return mode === "login" ? "Welcome back" : "Create your account";
    }, [mode]);

    const subtitle = useMemo(() => {
        return mode === "login"
            ? "Log in and continue your O-Level practice."
            : "Sign up to track streaks, XP, and progress.";
    }, [mode]);

    const canSubmit = useMemo(() => {
        if (loading) return false;
        if (mode === "login") return emailOrUsername.trim() && password.trim().length >= 6;
        return (
            name.trim() &&
            username.trim() &&
            email.trim() &&
            password.trim().length >= 6
        );
    }, [mode, loading, name, username, email, emailOrUsername, password]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (mode === "login") {
                await loginUser({ emailOrUsername: emailOrUsername.trim(), password });
            } else {
                await registerUser({
                    name: name.trim(),
                    username: username.trim().toLowerCase(),
                    email: email.trim().toLowerCase(),
                    password
                });
            }

            await refreshMe();
            navigate("/", { replace: true });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6
  bg-gradient-to-t from-indigo-200 via-violet-100 to-sky-200
">
            {/* soft blobs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-200/60 blur-3xl" />
                <div className="absolute top-20 -right-24 h-96 w-96 rounded-full bg-violet-200/50 blur-3xl" />
                <div className="absolute bottom-[-140px] left-1/3 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl" />
            </div>

            <div className="relative w-full flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    {/* Brand header */}
                    <div className="text-center">
                        <div className="mx-auto h-16 w-16 rounded-full text-white grid place-items-center font-black text-lg shadow-md">
                            <img
                                src={logo}
                                alt="Quizard logo"
                                className="h-14 w-14 rounded-2xl object-contain"
                            />

                        </div>
                        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
                            Quizard<span className="text-indigo-600">.</span>
                        </h1>
                        <p className="mt-2 text-slate-600">
                            Gamified practice for O-Level students.
                        </p>

                        {/* tiny vibe chips (optional but not noisy) */}
                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                            <Chip>⚡ 10–20 min</Chip>
                            <Chip>🔥 Streaks</Chip>
                            <Chip>🏆 XP</Chip>
                        </div>
                    </div>

                    {/* Card */}
                    <div className="mt-6 rounded-3xl border border-slate-200 bg-white/90 backdrop-blur shadow-md p-6 sm:p-7">
                        {/* Toggle */}
                        <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                            <Tab
                                active={mode === "login"}
                                onClick={() => {
                                    setError(null);
                                    setMode("login");
                                }}
                            >
                                Log In
                            </Tab>
                            <Tab
                                active={mode === "register"}
                                onClick={() => {
                                    setError(null);
                                    setMode("register");
                                }}
                            >
                                Sign Up
                            </Tab>
                        </div>

                        <div className="mt-5">
                            <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
                            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
                        </div>

                        {error && (
                            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <form onSubmit={onSubmit} className="mt-5 space-y-4">
                            {mode === "register" && (
                                <>
                                    <Field label="Name" value={name} onChange={setName} placeholder="e.g. Aye Chan" />
                                    <Field label="Username" value={username} onChange={setUsername} placeholder="e.g. ayechan07" />
                                    <Field label="Email" value={email} onChange={setEmail} placeholder="e.g. aye@gmail.com" type="email" />
                                </>
                            )}

                            {mode === "login" && (
                                <Field
                                    label="Email or Username"
                                    value={emailOrUsername}
                                    onChange={setEmailOrUsername}
                                    placeholder="e.g. ayechan07"
                                />
                            )}

                            <Field
                                label="Password"
                                value={password}
                                onChange={setPassword}
                                placeholder="At least 6 characters"
                                type="password"
                            />

                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className={[
                                    "w-full rounded-2xl py-3 font-extrabold text-white transition shadow-sm",
                                    "bg-indigo-600 hover:bg-indigo-700",
                                    "disabled:opacity-50 disabled:cursor-not-allowed"
                                ].join(" ")}
                            >
                                {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
                            </button>

                            <div className="text-xs text-slate-500 text-center">
                                {mode === "login" ? (
                                    <>
                                        New to Quizard?{" "}
                                        <button
                                            type="button"
                                            onClick={() => setMode("register")}
                                            className="font-bold text-indigo-700 hover:underline"
                                        >
                                            Create an account
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        Already have an account?{" "}
                                        <button
                                            type="button"
                                            onClick={() => setMode("login")}
                                            className="font-bold text-indigo-700 hover:underline"
                                        >
                                            Log in
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="mt-4 text-center text-xs text-slate-500">
                        By continuing, you agree to keep it respectful and study-focused.
                    </div>
                </div>
            </div>
        </div>
    );
}

function Tab({
    active,
    onClick,
    children
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "rounded-xl py-2 text-sm font-extrabold transition",
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            ].join(" ")}
        >
            {children}
        </button>
    );
}

function Field({
    label,
    value,
    onChange,
    placeholder,
    type
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-bold text-slate-800">{label}</label>
            <input
                type={type || "text"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={[
                    "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3",
                    "text-slate-900 placeholder:text-slate-400 shadow-sm",
                    "focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                ].join(" ")}
            />
        </div>
    );
}

function Chip({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {children}
        </span>
    );
}
