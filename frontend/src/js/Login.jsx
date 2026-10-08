import React, { useState } from "react";
import { useToast } from "./ToastProvider";
import AdminDashboard from "./ADashboard";
import { API } from "./config";

const Login = ({ onRegisterClick, onLoginSuccess }) => {
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);
const [resetEmail, setResetEmail] = useState("");
const [resetOpen, setResetOpen] = useState(false);

const [adminUser, setAdminUser] = useState(null);

const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Local admin shortcut
    if (
      email === "adminskillswap@gmail.com" &&
      password === "skillswap"
    ) {
      setAdminUser({
        email,
        role: "admin",
        name: "Administrator",
      });
      return;
    }

    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        onLoginSuccess({ ...data.user, email });
      } else {
        toast(data.message || "Login failed", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Login error - check if your server is running", "error");
    }
  };

if (adminUser) {
return (
<AdminDashboard
user={adminUser}
setUser={() => setAdminUser(null)}
/>
);
}

const handleForgot = async () => {
if (!resetEmail) {
toast("Enter your email", "error");
return;
}
try {
const res = await fetch(`${API}/password/forgot`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ email: resetEmail }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.message || "Failed to send reset link");
toast("If the email exists, a reset link has been sent.", "success");
setResetOpen(false);
setResetEmail("");
} catch (err) {
toast(err.message || "Failed to send reset link", "error");
}
};

return ( <div className="relative flex justify-center items-center h-screen bg-black overflow-hidden font-sans">

  <div
    className="absolute inset-0 opacity-20"
    style={{
      backgroundImage: "radial-gradient(#2563eb 0.5px, transparent 0.5px)",
      backgroundSize: "30px 30px",
    }}
  />
  <div className="absolute w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />

  <button
    onClick={() => window.location.assign("/?skipSplash=1")}
    className="absolute top-6 left-6 z-20 flex items-center gap-3 group"
  >
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700 blur-[6px] opacity-80" />
      <div className="relative w-full h-full rounded-2xl bg-black border border-blue-500/50 flex items-center justify-center group-hover:border-cyan-400">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-200">
          <polyline points="16 3 21 3 21 8"></polyline>
          <line x1="21" y1="3" x2="13" y2="11"></line>
          <polyline points="8 21 3 21 3 16"></polyline>
          <line x1="3" y1="21" x2="11" y2="13"></line>
        </svg>
      </div>
    </div>
    <div className="text-left">
      <p className="text-base font-black tracking-[0.25em] text-white">SKILLSWAP</p>
      <p className="text-xs uppercase text-blue-300/70 tracking-[0.25em]">Connect • Learn • Teach</p>
    </div>
  </button>

  <div className="relative z-10 w-[450px] h-[450px] rounded-full bg-black border-2 border-blue-500/50 flex flex-col items-center justify-center shadow-[0_0_60px_rgba(59,130,246,0.15)] p-14 transition-all hover:border-blue-400">

    <div className="text-center mb-6">
      <h2 className="text-white font-black tracking-[0.2em] text-4xl">
        LOGIN
      </h2>
      <div className="w-10 h-[2px] bg-cyan-400 mx-auto mt-2 shadow-[0_0_8px_#22d3ee]" />
    </div>

    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">

      <div className="flex flex-col gap-1">
        <label className="text-sm text-blue-400 font-bold ml-1">
          Email
        </label>
        <input
          type="email"
          placeholder="name@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-gray-900/40 border border-blue-500/20 p-3 rounded-xl text-base outline-none focus:border-cyan-400 focus:bg-gray-900/80 text-white placeholder:text-gray-700 transition-all"
        />
      </div>

      <div className="flex flex-col gap-1 relative">
        <label className="text-sm text-blue-400 font-bold ml-1">
          Password
        </label>
        <input
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full bg-gray-900/40 border border-blue-500/20 p-3 rounded-xl text-base outline-none focus:border-cyan-400 focus:bg-gray-900/80 text-white placeholder:text-gray-700 pr-12 transition-all"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-[32px] text-xs font-black text-blue-500 hover:text-cyan-400 transition-colors"
        >
          {showPassword ? "HIDE" : "SHOW"}
        </button>
      </div>

      <button
        type="submit"
        className="mt-4 bg-blue-600 text-white py-3 rounded-xl font-black text-sm tracking-[0.2em] hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all duration-500 active:scale-95"
      >
        INITIALIZE SESSION
      </button>
    </form>

    <div className="flex gap-4 mt-6 text-sm font-black text-blue-500/70">
      <button type="button" onClick={onRegisterClick} className="hover:text-cyan-400 transition-colors">
        New Account
      </button>
      <span className="opacity-20">|</span>
      <button type="button" onClick={() => setResetOpen(true)} className="hover:text-cyan-400 transition-colors">
        Reset Key
      </button>
    </div>
  </div>

  {resetOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-blue-500/40 rounded-3xl p-6 w-full max-w-md space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-white font-black tracking-wide text-lg">Reset Password</h3>
          <button onClick={() => setResetOpen(false)} className="text-blue-200 hover:text-white text-sm">✕</button>
        </div>
        <input
          type="email"
          placeholder="email@example.com"
          value={resetEmail}
          onChange={(e) => setResetEmail(e.target.value)}
          className="w-full bg-gray-900/60 border border-blue-500/30 p-3 rounded-xl text-base outline-none focus:border-cyan-400 text-white"
        />
        <button
          onClick={handleForgot}
          className="w-full py-3 bg-cyan-400 text-black font-black rounded-xl text-sm tracking-widest"
        >
          SEND RESET LINK
        </button>
      </div>
    </div>
  )}

  <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-blue-500/20" />
  <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-blue-500/20" />
</div>

);
};

export default Login;
