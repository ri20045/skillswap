import React, { useState, useEffect } from "react";
import { useToast } from "./ToastProvider";

const Dashboard = ({ user, onNavigate }) => {
  const [stats, setStats] = useState({
    activeSessions: 0,
    skillRequests: 0,
    completed: 0,
    matches: 0,
    ratingAvg: null,
    ratingCount: 0,
  });
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canTeachYouCount, setCanTeachYouCount] = useState(0);
  const [skills, setSkills] = useState({ have: [], want: [] });
  const [offerModal, setOfferModal] = useState(false);
  const [offerSkill, setOfferSkill] = useState("");
  const [helpModal, setHelpModal] = useState(false);
  const [helpMentor, setHelpMentor] = useState(null);
  const [helpSkill, setHelpSkill] = useState("");
  const [helpMessage, setHelpMessage] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [showMatches, setShowMatches] = useState(false);
  const toast = useToast();

  // Backend-powered stats (poll so the cards update whenever a new request arrives)
  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;

    const fetchStats = async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        const res = await fetch(`http://localhost:4000/api/sessions/${user.email}`);
        if (!res.ok) throw new Error("Failed to load sessions");
        const sessions = await res.json();

        const isParticipant = (session) =>
          session.senderEmail === user.email || session.receiverEmail === user.email;

        const mine = sessions.filter(isParticipant);
        const pending = mine.filter((s) => (s.status || "pending") === "pending").length;
        const active = mine.filter((s) => {
          const status = s.status || "pending";
          return status === "accepted" || status === "active";
        }).length;
        const completed = mine.filter((s) => s.status === "completed").length;

        if (!cancelled) {
          setSessions(mine);
          setStats((prev) => ({
            ...prev,
            activeSessions: active,
            skillRequests: pending,
            completed,
            matches: 0,
          }));
        }
      } catch (err) {
        console.error("Dashboard stats error", err);
        if (!cancelled)
          setStats((prev) => ({ ...prev, activeSessions: 0, skillRequests: 0, matches: 0 }));
      } finally {
        if (!cancelled && showSpinner) setLoading(false);
      }
    };

    fetchStats(true);
    const interval = setInterval(() => fetchStats(false), 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  // Backend match count
  useEffect(() => {
    if (!user?.email) return;

    fetch(`http://localhost:4000/api/match/${user.email}`)
      .then((res) => res.json())
      .then((data) => {
        const canTeach = data.filter((u) => u.isPotentialTeacher);
        setTeachers(canTeach);
        setCanTeachYouCount(canTeach.length);
      });
  }, [user]);

  // Load skills
  useEffect(() => {
    if (!user?.email) return;
    fetch(`http://localhost:4000/api/skills/${user.email}`)
      .then((res) => res.json())
      .then((data) =>
        setSkills({
          have: (data.skillsIHave || []).map((s) => s.toLowerCase()),
          want: (data.skillsIWant || []).map((s) => s.toLowerCase()),
        })
      )
      .catch(() => {});
  }, [user?.email]);

  const handleAddTeachQuick = async () => {
    const normalized = offerSkill.trim().toLowerCase();
    if (!normalized) return;
    const updated = [...new Set([...skills.have, normalized])];
    try {
      await fetch(`http://localhost:4000/api/skills/${user.email}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillsIHave: updated, skillsIWant: skills.want }),
      });
      setSkills((prev) => ({ ...prev, have: updated }));
      setOfferSkill("");
      setOfferModal(false);
      toast("Skill added to your teach list", "success");
    } catch (err) {
      toast("Could not save skill", "error");
    }
  };

  const handleSendQuickRequest = async () => {
    if (!helpMentor || !helpSkill) {
      toast("Select mentor and skill", "error");
      return;
    }
    try {
      const res = await fetch("http://localhost:4000/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderEmail: user.email,
          senderName: user.name,
          receiverEmail: helpMentor.email,
          skill: helpSkill,
          message: helpMessage,
        }),
      });
      if (!res.ok) throw new Error("fail");
      toast("Request sent", "success");
      setHelpModal(false);
      setHelpMentor(null);
      setHelpSkill("");
      setHelpMessage("");
    } catch (err) {
      toast("Could not send request", "error");
    }
  };

  // Ratings for current user
  useEffect(() => {
    if (!user?.email) return;
    fetch("http://localhost:4000/api/ratings")
      .then((res) => res.json())
      .then((data) => {
        const mine = data.filter((r) => r.toEmail === user.email);
        if (!mine.length) {
          setStats((prev) => ({ ...prev, ratingAvg: null, ratingCount: 0 }));
          return;
        }
        const total = mine.reduce((sum, r) => sum + (r.score || 0), 0);
        setStats((prev) => ({
          ...prev,
          ratingAvg: total / mine.length,
          ratingCount: mine.length,
        }));
      })
      .catch((err) => console.error("Rating fetch error", err));
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  const recentActivity = [...sessions]
    .sort(
      (a, b) =>
        new Date(b.timestamp || b._id?.toString().slice(-8)) -
        new Date(a.timestamp || a._id?.toString().slice(-8))
    )
    .slice(0, 4);

  const Metric = ({ title, value, subtitle, icon, accent, cta }) => (
    <div className="bg-gray-900/60 border border-blue-500/20 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg ${accent}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm text-blue-300/80">{title}</p>
        <p className="text-3xl font-black text-white">{value}</p>
        {subtitle && <p className="text-xs text-blue-400/70 mt-1">{subtitle}</p>}
        {cta}
      </div>
    </div>
  );

  const quickActions = [
    { label: "Browse Skills", desc: "Find mentors", onClick: () => onNavigate?.("browse"), color: "bg-blue-500/15 text-blue-200" },
    { label: "Update Profile", desc: "Manage skills", onClick: () => onNavigate?.("profile"), color: "bg-emerald-500/15 text-emerald-200" },
    { label: "Manage Requests", desc: "View sessions", onClick: () => onNavigate?.("sessions"), color: "bg-purple-500/15 text-purple-200" },
  ];

  return (
    <>
    <div className="relative min-h-screen bg-black text-white overflow-hidden p-8">

      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(#2563eb 0.5px, transparent 0.5px)",
          backgroundSize: "30px 30px",
        }}
      />
      <div className="absolute w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] -top-40 -left-40" />

      <div className="relative z-10 space-y-8 max-w-7xl mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black tracking-tight">🏠 Welcome back, {user?.name || "Mentor"}!</h1>
          <p className="text-blue-300/80 text-sm mt-1">Here&apos;s what&apos;s happening with your skill swaps.</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric title="Active Requests" value={stats.activeSessions} subtitle="Accepted or in progress" icon="⚡" accent="bg-blue-500/20 text-blue-200" />
          <Metric title="Completed Swaps" value={stats.completed} subtitle="Wrapped up" icon="✅" accent="bg-emerald-500/20 text-emerald-200" />
          <Metric title="Pending Requests" value={stats.skillRequests} subtitle="Awaiting your decision" icon="⏳" accent="bg-amber-500/20 text-amber-200" />
          <Metric
            title="Matches"
            value={canTeachYouCount}
            subtitle="Can teach you"
            icon="❤️"
            accent="bg-pink-500/20 text-pink-200"
            cta={
              canTeachYouCount > 0 && (
                <button
                  onClick={() => setShowMatches(true)}
                  className="mt-3 text-[11px] px-3 py-1 bg-pink-500/15 text-pink-100 rounded-lg border border-pink-400/30 hover:border-cyan-400"
                >
                  View matches
                </button>
              )
            }
          />
        </div>

        {/* Quick actions + activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="bg-gray-900/60 border border-blue-500/20 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-black tracking-wide mb-2">Quick Actions</h3>
            <div className="space-y-3">
              {quickActions.map((qa) => (
                <button
                  key={qa.label}
                  onClick={qa.onClick}
                  className={`text-left w-full ${qa.color} border border-white/5 rounded-xl px-4 py-4 hover:border-cyan-400 transition flex items-center justify-between`}
                >
                  <div>
                    <p className="font-bold text-lg">{qa.label}</p>
                    <p className="text-xs text-white/70">{qa.desc}</p>
                  </div>
                  <span className="text-xl">›</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-900/60 border border-blue-500/20 rounded-2xl p-6 h-full">
            <h3 className="text-lg font-black tracking-wide mb-3">Recent Activity</h3>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-blue-300/70">No recent swaps yet.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((s) => (
                  <div
                    key={s._id}
                    className="bg-white/5 rounded-xl px-4 py-3 text-sm flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-base">
                        {s.skill || "Skill Swap"}{" "}
                        <span className="text-blue-300/80">with</span>{" "}
                        {s.receiverEmail === user.email ? s.senderEmail : s.receiverEmail}
                      </p>
                      <p className="text-[11px] text-blue-400/60">
                        {new Date(s.timestamp || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-black capitalize ${
                        (s.status || "pending") === "pending"
                          ? "bg-amber-500/20 text-amber-200 border border-amber-400/30"
                          : (s.status || "pending") === "completed"
                          ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
                          : (s.status || "pending") === "cancelled"
                          ? "bg-slate-500/20 text-slate-200 border border-slate-400/30"
                          : (s.status || "pending") === "accepted"
                          ? "bg-blue-500/20 text-blue-200 border border-blue-400/30"
                          : "bg-rose-500/20 text-rose-200 border border-rose-400/30"
                      }`}
                    >
                      {s.status || "pending"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Page corners */}
      <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-blue-500/20" />
      <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-blue-500/20" />
    </div>

      {/* Matches modal */}
      {showMatches && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-pink-400/40 w-full max-w-3xl rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white">People who can teach you</h3>
                <p className="text-blue-300/70 text-sm">{teachers.length} match{teachers.length === 1 ? "" : "es"}</p>
              </div>
              <button
                onClick={() => setShowMatches(false)}
                className="text-blue-200 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {teachers.length === 0 ? (
              <p className="text-blue-300/80 text-sm">No matches right now.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {teachers.map((t) => (
                  <div key={t.email} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-white">{t.name}</p>
                        <p className="text-blue-300 text-xs">{t.email}</p>
                      </div>
                      {t.isPerfectMatch && (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-100 border border-emerald-400/30">
                          Perfect match
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] uppercase text-cyan-200 font-bold tracking-[0.2em] mb-1">
                        They can teach
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(t.matchedSkills || t.skillsIHave || []).map((s) => (
                          <span
                            key={s}
                            className="px-2 py-1 rounded-full bg-cyan-900/40 text-cyan-100 border border-cyan-400/30 text-[12px]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setHelpModal(true) ||
                        (setHelpMentor(t), setHelpSkill((t.matchedSkills || t.skillsIHave || [])[0] || ""))
                      }
                      className="w-full mt-2 px-3 py-2 bg-pink-500 text-black font-black text-xs rounded-lg hover:bg-cyan-400"
                    >
                      Send request
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Offer Skill modal */}
      {offerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-cyan-400/40 w-full max-w-md rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-white">Add a skill to teach</h3>
              <button onClick={() => setOfferModal(false)} className="text-blue-200 hover:text-white text-sm">✕</button>
            </div>
            <input
              value={offerSkill}
              onChange={(e) => setOfferSkill(e.target.value)}
              placeholder="e.g., robotics"
              className="w-full bg-black/50 border border-blue-500/30 rounded-xl p-3 text-white"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setOfferModal(false)} className="text-blue-200 text-xs font-bold">Cancel</button>
              <button onClick={handleAddTeachQuick} className="px-5 py-2 bg-cyan-400 text-black rounded-xl font-black text-xs tracking-widest">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Request Help modal */}
      {helpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-blue-500/30 w-full max-w-xl rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-white">Quick request</h3>
              <button onClick={() => setHelpModal(false)} className="text-blue-200 hover:text-white text-sm">✕</button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-blue-300 font-bold">
                  Mentor
                </label>
                <select
                  value={helpMentor?.email || ""}
                  onChange={(e) => {
                    const m = teachers.find((t) => t.email === e.target.value);
                    setHelpMentor(m || null);
                    setHelpSkill(m?.matchedSkills?.[0] || "");
                  }}
                  className="w-full mt-1 bg-black/60 border border-blue-500/30 rounded-xl p-3 text-white text-sm"
                >
                  <option value="">Choose</option>
                  {teachers.map((t) => (
                    <option key={t.email} value={t.email}>
                    {t.name} ({t.matchedSkills.join(", ")})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-blue-300 font-bold">
                  Skill
                </label>
                <select
                  value={helpSkill}
                  onChange={(e) => setHelpSkill(e.target.value)}
                  className="w-full mt-1 bg-black/60 border border-blue-500/30 rounded-xl p-3 text-white text-sm"
                  disabled={!helpMentor}
                >
                  {(helpMentor?.matchedSkills || []).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <textarea
              value={helpMessage}
              onChange={(e) => setHelpMessage(e.target.value)}
              placeholder="Optional message"
              className="w-full h-28 bg-black/50 border border-blue-500/30 rounded-xl p-3 text-white"
            />

            <div className="flex justify-end gap-3">
              <button onClick={() => setHelpModal(false)} className="text-blue-200 text-xs font-bold">
                Cancel
              </button>
              <button onClick={handleSendQuickRequest} className="px-6 py-3 bg-cyan-400 text-black rounded-xl font-black text-xs tracking-widest">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;
