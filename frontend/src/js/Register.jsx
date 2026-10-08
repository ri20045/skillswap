import React, { useState } from "react";
import { useToast } from "./ToastProvider";

const Register = ({ onLoginClick }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast("Passwords do not match!", "error");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        toast("Registration successful! Please sign in.", "success");
        setName(""); setEmail(""); setPassword(""); setConfirmPassword("");
        onLoginClick();
      } else {
        toast(data.message || "Registration failed", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Registration error", "error");
    }
  };

  return (
    <div className="relative flex justify-center items-center h-screen bg-black overflow-hidden">

      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(#2563eb 0.5px, transparent 0.5px)",
          backgroundSize: "30px 30px",
        }}
      />

      {/* ✅ TOP LEFT LOGO BOX (RESTORED) */}
      <button
        onClick={() => window.location.assign("/?skipSplash=1")}
        className="absolute top-6 left-6 z-20 flex items-center gap-3 group"
      >
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700 blur-[6px] opacity-80" />
          <div className="relative w-full h-full rounded-2xl bg-black border border-blue-500/50 flex items-center justify-center group-hover:border-cyan-400">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-cyan-200"
            >
              <polyline points="16 3 21 3 21 8"></polyline>
              <line x1="21" y1="3" x2="13" y2="11"></line>
              <polyline points="8 21 3 21 3 16"></polyline>
              <line x1="3" y1="21" x2="11" y2="13"></line>
            </svg>
          </div>
        </div>
        <div className="text-left">
          <p className="text-base font-black tracking-[0.25em] text-white">
            SKILLSWAP
          </p>
          <p className="text-xs uppercase text-blue-300/70 tracking-[0.25em]">
            Connect • Learn • Teach
          </p>
        </div>
      </button>

      {/* Main Circle */}
      <div className="relative z-10 w-[570px] h-[570px] rounded-full bg-black border-2 border-blue-500 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.2)] p-12">

        <div className="text-center mb-5">
          <h2 className="text-white font-black tracking-widest text-3xl uppercase">
            Register
          </h2>
          <div className="w-12 h-[2px] bg-cyan-500 mx-auto mt-1" />
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 px-10">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-blue-400 font-bold uppercase">
              Full Name
            </label>
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-gray-900/50 border border-blue-500/30 p-3 rounded-lg text-sm outline-none focus:border-cyan-400 text-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-blue-400 font-bold uppercase">
              Email
            </label>
            <input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-900/50 border border-blue-500/30 p-3 rounded-lg text-sm outline-none focus:border-cyan-400 text-white"
            />
          </div>

          <div className="flex flex-col gap-1 relative">
            <label className="text-xs text-blue-400 font-bold uppercase">
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-900/50 border border-blue-500/30 p-3 rounded-lg text-sm outline-none focus:border-cyan-400 text-white"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cyan-500 font-bold"
              >
                {showPass ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 relative">
            <label className="text-xs text-blue-400 font-bold uppercase">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPass ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-gray-900/50 border border-blue-500/30 p-3 rounded-lg text-sm outline-none focus:border-cyan-400 text-white"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cyan-500 font-bold"
              >
                {showConfirmPass ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="mt-3 bg-blue-600 text-white py-3 rounded-lg font-bold text-sm tracking-widest hover:bg-cyan-500 hover:text-black transition-all"
          >
            CREATE ACCOUNT
          </button>
        </form>

        <button
          type="button"
          onClick={onLoginClick}
          className="mt-5 text-xs uppercase font-bold text-blue-400 hover:text-white"
        >
          Already have an account? Login
        </button>

      </div>
    </div>
  );
};

export default Register;