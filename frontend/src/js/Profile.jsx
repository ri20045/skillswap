import React, { useState, useEffect } from "react";
import { useToast } from "./ToastProvider";
import { API } from "./config";

const Profile = ({ user, setUser }) => {
  const [skillsIHave, setSkillsIHave] = useState([]);
  const [skillsIWant, setSkillsIWant] = useState([]);
  const [haveSkill, setHaveSkill] = useState("");
  const [wantSkill, setWantSkill] = useState("");
  const [matches, setMatches] = useState([]);
  const [myRatings, setMyRatings] = useState([]);
  const [displayName, setDisplayName] = useState(user.name);
  const [newPassword, setNewPassword] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [composeTarget, setComposeTarget] = useState(null); // { mentor, skill }
  const [composeMessage, setComposeMessage] = useState("");
  const toast = useToast();

  // Load skills
  useEffect(() => {
    fetch(`${API}/skills/${user.email}`)
      .then((res) => res.json())
      .then((data) => {
        setSkillsIHave(data.skillsIHave || []);
        setSkillsIWant(data.skillsIWant || []);
      });
  }, [user.email]);

  // Sync displayName when user changes
  useEffect(() => {
    setDisplayName(user.name);
  }, [user.name]);

  const saveSkills = (have, want) => {
    fetch(`${API}/skills/${user.email}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillsIHave: have, skillsIWant: want }),
    });
  };

  const addHaveSkill = () => {
    const normalized = haveSkill.trim().toLowerCase();
    if (!normalized) return;
    const updated = [...new Set([...skillsIHave.map((s) => s.trim().toLowerCase()), normalized])];
    setSkillsIHave(updated);
    saveSkills(updated, skillsIWant);
    setHaveSkill("");
  };

  const addWantSkill = () => {
    const normalized = wantSkill.trim().toLowerCase();
    if (!normalized) return;
    const updated = [...new Set([...skillsIWant.map((s) => s.trim().toLowerCase()), normalized])];
    setSkillsIWant(updated);
    saveSkills(skillsIHave, updated);
    setWantSkill("");
  };

  const removeHaveSkill = (skill) => {
    const updated = skillsIHave.filter((s) => s !== skill);
    setSkillsIHave(updated);
    saveSkills(updated, skillsIWant);
  };

  const removeWantSkill = (skill) => {
    const updated = skillsIWant.filter((s) => s !== skill);
    setSkillsIWant(updated);
    saveSkills(skillsIHave, updated);
  };

  const findMatches = () => {
    fetch(`${API}/match/${user.email}`)
      .then((res) => res.json())
      .then((data) => setMatches(data));
  };

  const sendMessage = async (mentor, skill) => {
    setComposeTarget({ mentor, skill });
    setComposeMessage("");
  };

  const handleSendCompose = async () => {
    if (!composeTarget) return;
    try {
      const res = await fetch(`${API}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderEmail: user.email,
          senderName: user.name,
          receiverEmail: composeTarget.mentor.email,
          skill: composeTarget.skill,
          message: composeMessage,
        }),
      });

      if (!res.ok) throw new Error("Failed to send request");
      toast("Request sent!", "success");
      setComposeTarget(null);
      setComposeMessage("");
    } catch (err) {
      console.error(err);
      toast("Could not send request. Please try again.", "error");
    }
  };

  // Fetch ratings/feedback about me
  useEffect(() => {
    fetch(`${API}/ratings`)
      .then((res) => res.json())
      .then((data) => {
        const mine = data.filter((r) => r.toEmail === user.email);
        setMyRatings(mine);
      })
      .catch((err) => console.error("Ratings fetch error", err));
  }, [user.email]);

  const handleUpdateAccount = async () => {
    if (!displayName.trim() && !newPassword.trim()) return;
    if (newPassword && newPassword.length < 4) {
      toast("Password must be at least 4 characters", "error");
      return;
    }

    setSavingAccount(true);
    try {
      const res = await fetch(`${API}/users/${user.email}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: displayName.trim() || undefined,
          password: newPassword || undefined,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      const data = await res.json();
      setUser?.(data.user || user);
      setNewPassword("");
      toast("Account updated", "success");
    } catch (err) {
      console.error(err);
      toast("Could not update account", "error");
    } finally {
      setSavingAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] py-12">
      <div className="max-w-5xl mx-auto space-y-10 px-4">

        {/* Header */}
        <div className="relative bg-[#020617]/80 border border-blue-500/20 rounded-3xl p-8 text-center backdrop-blur">
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-blue-500/20" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-blue-500/20" />

          <div className="w-20 h-20 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-black shadow-lg">
            {(displayName || user.name)[0].toUpperCase()}
          </div>

          <div className="flex items-center justify-center gap-2 mt-4">
            <h2 className="text-2xl font-black text-white tracking-wide">
              {displayName || user.name}
            </h2>
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1 text-blue-200 hover:text-white text-xs font-bold px-3 py-1 border border-blue-500/40 rounded-lg"
              aria-label="Edit account"
            >
              ✎ Edit Profile
            </button>
          </div>
          <p className="text-blue-400/60 text-sm">{user.email}</p>
        </div>

        {/* Account settings modal */}
        {editOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0b1224] border border-blue-500/40 rounded-3xl p-6 w-full max-w-xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-black tracking-wide">Edit Account</h3>
                <button
                  onClick={() => setEditOpen(false)}
                  className="text-blue-200 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-blue-300 font-bold">
                    Display Name
                  </label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full mt-1 bg-gray-900/60 border border-blue-500/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-blue-300 font-bold">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="w-full mt-1 bg-gray-900/60 border border-blue-500/20 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 text-blue-200 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAccount}
                  disabled={savingAccount}
                  className="px-6 py-3 bg-blue-600 hover:bg-cyan-400 hover:text-black rounded-xl font-black text-xs tracking-widest transition disabled:opacity-60"
                >
                  {savingAccount ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Skills */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Teach */}
          <div className="bg-[#020617]/80 border border-blue-500/20 rounded-2xl p-6 backdrop-blur">
            <h3 className="text-white font-black tracking-wide mb-4">
              ⭐ SKILLS I CAN TEACH
            </h3>

            <div className="flex gap-2 mb-4">
              <input
                value={haveSkill}
                onChange={(e) => setHaveSkill(e.target.value)}
                placeholder="add skill"
                className="flex-1 bg-gray-900/60 border border-blue-500/20 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-cyan-400"
              />
              <button
                onClick={addHaveSkill}
                className="bg-blue-600 hover:bg-cyan-400 hover:text-black px-5 rounded-xl font-black text-xs tracking-widest transition"
              >
                ADD
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {skillsIHave.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 rounded-full text-xs bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center gap-2"
                >
                  {s}
                  <button
                    onClick={() => removeHaveSkill(s)}
                    className="text-blue-200 hover:text-white text-[10px]"
                    aria-label={`Remove ${s}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Learn */}
          <div className="bg-[#020617]/80 border border-blue-500/20 rounded-2xl p-6 backdrop-blur">
            <h3 className="text-white font-black tracking-wide mb-4">
              🎯 SKILLS I WANT
            </h3>

            <div className="flex gap-2 mb-4">
              <input
                value={wantSkill}
                onChange={(e) => setWantSkill(e.target.value)}
                placeholder="add skill"
                className="flex-1 bg-gray-900/60 border border-blue-500/20 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-cyan-400"
              />
              <button
                onClick={addWantSkill}
                className="bg-blue-600 hover:bg-cyan-400 hover:text-black px-5 rounded-xl font-black text-xs tracking-widest transition"
              >
                ADD
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {skillsIWant.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 rounded-full text-xs bg-cyan-400/10 text-cyan-300 border border-cyan-400/30 flex items-center gap-2"
                >
                  {s}
                  <button
                    onClick={() => removeWantSkill(s)}
                    className="text-cyan-200 hover:text-white text-[10px]"
                    aria-label={`Remove ${s}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Matches */}
        <div className="bg-[#020617]/80 border border-blue-500/20 rounded-3xl p-6 backdrop-blur">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-black tracking-wide">
              🤝 SKILL SWAP SUGGESTIONS
            </h3>
            <button
              onClick={findMatches}
              className="bg-blue-600 hover:bg-cyan-400 hover:text-black px-6 py-2 rounded-xl font-black text-xs tracking-widest transition"
            >
              FIND MATCHES
            </button>
          </div>

          {matches.length === 0 ? (
            <p className="text-blue-400/60 text-sm">No matches yet</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {matches.map((m) => {
                const skillsToRequest = skillsIWant.filter((s) =>
                  m.skillsIHave.includes(s)
                );

                return (
                  <div
                    key={m.email}
                    className="relative border border-blue-500/20 rounded-2xl p-4 bg-[#020617]/70"
                  >
                    <h4 className="text-white font-bold">{m.name}</h4>
                    <p className="text-xs text-blue-400/60 mb-3">{m.email}</p>

                    <div className="flex flex-wrap gap-2">
                      {skillsToRequest.map((s) => (
                        <span
                          key={s}
                          onClick={() => sendMessage(m, s)}
                          className="cursor-pointer px-3 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/40 transition"
                        >
                          {s} 💬
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My Feedback */}
        <div className="bg-[#020617]/80 border border-amber-400/30 rounded-3xl p-6 backdrop-blur">
          <h3 className="text-white font-black tracking-wide mb-4 flex items-center gap-2">
            ⭐ My Ratings & Feedback
            {myRatings.length > 0 && (
              <span className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/40 px-2 py-1 rounded-full">
                {myRatings.length} review{myRatings.length === 1 ? "" : "s"}
              </span>
            )}
          </h3>

          {myRatings.length > 0 && (
            <div className="flex gap-2 mb-4 text-xs">
              {[
                { key: "gold", icon: "🥇" },
                { key: "silver", icon: "🥈" },
                { key: "bronze", icon: "🥉" },
              ].map(({ key, icon }) => {
                const count = myRatings.filter((r) => r.badge === key).length;
                if (!count) return null;
                return (
                  <span
                    key={key}
                    className="px-3 py-1 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-200 text-sm"
                  >
                    <span className="text-base align-middle">{icon}</span> x{count}
                  </span>
                );
              })}
            </div>
          )}

          {myRatings.length === 0 ? (
            <p className="text-amber-100/70 text-sm">No feedback yet.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {myRatings.map((r, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex justify-between text-xs text-amber-200 mb-1">
                    <span>⭐ {r.score}/5</span>
                    {r.createdAt && (
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  <p className="text-sm text-white">{r.feedback || "No feedback text"}</p>
                  {r.badge && (
                    <p className="text-sm text-amber-200 mt-1 flex items-center gap-1">
                      <span className="text-base">
                        {r.badge === "gold" ? "🥇" : r.badge === "silver" ? "🥈" : "🥉"}
                      </span>
                    </p>
                  )}
                  {r.fromEmail && (
                    <p className="text-[10px] text-blue-300/70 mt-1">from {r.fromEmail}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compose modal */}
      {composeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-blue-500/30 w-full max-w-md rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-white">
                Message {composeTarget.mentor.name}
              </h3>
              <button
                onClick={() => setComposeTarget(null)}
                className="text-blue-200 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-blue-300/70">
              Skill: <span className="font-semibold text-cyan-300">{composeTarget.skill}</span>
            </p>
            <textarea
              value={composeMessage}
              onChange={(e) => setComposeMessage(e.target.value)}
              placeholder="Optional message"
              className="w-full h-32 bg-black/50 border border-blue-500/30 rounded-xl p-3 text-white"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setComposeTarget(null)}
                className="px-4 py-2 text-blue-200 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSendCompose}
                className="px-5 py-2 bg-cyan-400 text-black rounded-xl font-black text-xs tracking-widest"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
