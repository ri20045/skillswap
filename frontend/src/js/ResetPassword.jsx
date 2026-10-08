import React, { useState } from "react";
import { useToast } from "./ToastProvider";
import { API } from "./config";

const ResetPassword = ({ token, email }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleReset = async () => {
    if (!password || password.length < 4) {
      toast("Password must be at least 4 characters", "error");
      return;
    }
    if (password !== confirm) {
      toast("Passwords do not match", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Reset failed");
      toast("Password reset. Please log in.", "success");
      window.location.href = "/";
    } catch (err) {
      toast(err.message || "Reset failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
      <div className="bg-[#0f172a] border border-blue-500/30 rounded-3xl p-8 w-full max-w-md space-y-4">
        <h2 className="text-2xl font-black tracking-widest">Reset Password</h2>
        <p className="text-sm text-blue-200/70">{email}</p>
        <div className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="w-full bg-black/40 border border-blue-500/30 rounded-xl p-3 text-white"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className="w-full bg-black/40 border border-blue-500/30 rounded-xl p-3 text-white"
          />
        </div>
        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full py-3 bg-cyan-400 text-black font-black rounded-xl tracking-widest disabled:opacity-60"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
        <p className="text-[12px] text-blue-300/60">Link valid for 15 minutes.</p>
      </div>
    </div>
  );
};

export default ResetPassword;
