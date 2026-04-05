import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Navbar() {
  const { user, signInWithGoogle, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success("Signed in successfully");
    } catch {
      toast.error("Sign-in failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    setMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Glass blur bar */}
      <div className="border-b border-bg-border/50 bg-bg-primary/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center glow-brand">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" fill="white" />
                <circle cx="3" cy="4" r="1.5" fill="white" opacity="0.6" />
                <circle cx="13" cy="4" r="1.5" fill="white" opacity="0.6" />
                <circle cx="3" cy="12" r="1.5" fill="white" opacity="0.4" />
                <circle cx="13" cy="12" r="1.5" fill="white" opacity="0.4" />
                <line
                  x1="8"
                  y1="5"
                  x2="3"
                  y2="4"
                  stroke="white"
                  strokeWidth="0.8"
                  opacity="0.5"
                />
                <line
                  x1="8"
                  y1="5"
                  x2="13"
                  y2="4"
                  stroke="white"
                  strokeWidth="0.8"
                  opacity="0.5"
                />
              </svg>
            </div>
            <span className="font-display font-700 text-lg text-white group-hover:text-brand-400 transition-colors">
              Fair<span className="text-brand-400">Lens</span>
            </span>
          </Link>

          {/* Center nav links */}
          <div className="hidden md:flex items-center gap-1">
{[
  { label: "Home", to: "/", protected: false },
  { label: "Analyze", to: "/upload", protected: true },
  { label: "History", to: "/history", protected: true },
].map(({ label, to, protected: isProtected }) => (
  <button
    key={to}
    onClick={() => {
      if (isProtected && !user) {
        toast("Please sign in to access " + label, { icon: "🔐", duration: 2000 });
        return;
      }
      window.location.href = to;
    }}
    className={`px-4 py-2 rounded-lg text-sm font-medium font-body transition-all ${
      location.pathname === to
        ? "text-brand-400 bg-brand-500/10"
        : "text-muted hover:text-white hover:bg-white/5"
    }`}
  >
    {label}
  </button>
))}
          </div>

          {/* Right: Auth */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-bg-border hover:border-brand-500/50 transition-all"
                >
                  <img
                    src={
                      user.photoURL ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "U")}&background=6366f1&color=fff`
                    }
                    alt={user.displayName}
                    className="w-7 h-7 rounded-full"
                  />
                  <span className="text-sm text-subtle font-body hidden sm:block max-w-[120px] truncate">
                    {user.displayName?.split(" ")[0]}
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-52 glass-card py-1.5 shadow-xl shadow-black/50"
                    >
                      <div className="px-4 py-2 border-b border-bg-border">
                        <p className="text-sm font-medium text-white truncate">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-muted truncate">
                          {user.email}
                        </p>
                      </div>
                      <Link
                        to="/upload"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-subtle hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                        New Analysis
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button onClick={handleSignIn} className="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
