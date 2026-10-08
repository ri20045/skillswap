import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const API = "http://localhost:4000/api";

/* ================= SMALL UI COMPONENTS ================= */

const Card = ({ title, value }) => (
  <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg shadow-black/20 backdrop-blur-sm">
    <p className="text-[11px] tracking-wide text-slate-400 uppercase">{title}</p>
    <h3 className="text-3xl font-semibold text-emerald-300 mt-2">{value}</h3>
  </div>
);

const Button = ({ children, color = "gray", ...props }) => {
  const colors = {
    red: "bg-rose-600 hover:bg-rose-700 text-white",
    green: "bg-emerald-600 hover:bg-emerald-700 text-white",
    yellow: "bg-amber-500 hover:bg-amber-600 text-slate-900",
    blue: "bg-sky-600 hover:bg-sky-700 text-white",
    gray: "bg-slate-800 hover:bg-slate-700 text-slate-100",
  };
  return (
    <button
      {...props}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition shadow-sm shadow-black/20 ${colors[color]}`}
    >
      {children}
    </button>
  );
};

const statusStyle = (status = "") => {
  const key = status.toLowerCase();
  if (key.includes("reject")) {
    return "bg-rose-900/60 text-rose-200 border border-rose-800";
  }
  if (key.includes("pend")) {
    return "bg-amber-900/60 text-amber-200 border border-amber-800";
  }
  if (key.includes("accept") || key.includes("active") || key.includes("complete")) {
    return "bg-emerald-900/60 text-emerald-200 border border-emerald-800";
  }
  return "bg-slate-800 text-slate-200 border border-slate-700";
};

const statusColor = (status = "") => {
  const key = status.toLowerCase();
  if (key.includes("reject") || key.includes("cancel")) return "#f87171"; // red/rose
  if (key.includes("pend")) return "#fbbf24"; // amber
  if (key.includes("accept") || key.includes("active") || key.includes("complete"))
    return "#34d399"; // emerald
  return "#94a3b8"; // slate
};

const badgeChip = (badge = "") => {
  const key = badge.toLowerCase();
  if (key.includes("gold")) return { icon: "🥇", color: "bg-amber-900/60 text-amber-100 border border-amber-700" };
  if (key.includes("silver")) return { icon: "🥈", color: "bg-slate-800 text-slate-100 border border-slate-600" };
  if (key.includes("bronze")) return { icon: "🥉", color: "bg-orange-900/60 text-orange-100 border border-orange-700" };
  return { icon: "🎖️", color: "bg-emerald-900/60 text-emerald-100 border border-emerald-700" };
};

const formatAge = (date) => {
  if (!date) return "unknown";
  const diffMs = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h`;
};

/* ================= MAIN COMPONENT ================= */

export default function AdminDashboard({ user, setUser }) {
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({});
  const [password, setPassword] = useState("");
  const [sessionStats, setSessionStats] = useState([]);
  const [activeTab, setActiveTab] = useState("users");
  const [feedbacks, setFeedbacks] = useState([]);
  const [ratingTrend, setRatingTrend] = useState([]);
  const [mentorRows, setMentorRows] = useState([]);
  const [skillFilter, setSkillFilter] = useState("all");
  const [minRatingFilter, setMinRatingFilter] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementForm, setAnnouncementForm] = useState({
    message: "",
    startAt: "",
    endAt: "",
  });
  const [now, setNow] = useState(Date.now());
  const [deletingFeedback, setDeletingFeedback] = useState(null);

  /* ================= LOAD DATA ================= */

  const fetchAnnouncements = async () => {
    const res = await fetch(`${API}/admin/announcements`, { cache: "no-store" });
    if (!res.ok) return;
    const ann = await res.json();
    setAnnouncements(Array.isArray(ann) ? ann : []);
  };

  const loadData = useCallback(async () => {
    try {
      const [u, s, st, ratings] = await Promise.all([
        fetch(`${API}/admin/users`).then((r) => r.json()),
        fetch(`${API}/admin/sessions`).then((r) => r.json()),
        fetch(`${API}/admin/stats`).then((r) => r.json()),
        fetch(`${API}/ratings`).then((r) => r.json()),
      ]);
      setUsers(u || []);
      setSessions(s || []);
      setStats(st || {});
      setFeedbacks(ratings || []);
      computeSessionStats(s || []);
      computeRatingTrend(ratings || []);
      computeMentorRows(u || [], s || []);
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
    }
  }, []);

  const computeSessionStats = (sessionList) => {
    const counts = sessionList.reduce((acc, s) => {
      const key = (s.status || "unknown").toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const preferredOrder = [
      "accepted",
      "pending",
      "rejected",
      "cancelled",
      "completed",
      "active",
      "ongoing",
      "unknown",
    ];

    const ordered = Object.entries(counts).sort(
      ([a], [b]) =>
        preferredOrder.indexOf(a) - preferredOrder.indexOf(b) ||
        a.localeCompare(b)
    );

    const data = ordered.map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
    }));

    setSessionStats(data);
  };

  const computeRatingTrend = (ratings) => {
    const grouped = ratings.reduce((acc, r) => {
      const date = r.createdAt
        ? new Date(r.createdAt).toISOString().slice(0, 10)
        : "Unknown";
      const entry = acc[date] || { total: 0, count: 0 };
      const score = Number(r.score ?? r.rating ?? 0);
      acc[date] = { total: entry.total + score, count: entry.count + 1 };
      return acc;
    }, {});

    const data = Object.entries(grouped)
      .map(([date, info]) => ({
        date,
        avg: info.count ? +(info.total / info.count).toFixed(2) : 0,
      }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    setRatingTrend(data);
  };

  const computeMentorRows = (usersList, sessionsList) => {
    const completedByEmail = sessionsList.reduce((acc, session) => {
      const status = (session.status || "").toLowerCase();
      const isCompleted = status.includes("complete");
      const completedRecently =
        isCompleted &&
        session.updatedAt &&
        Date.now() - new Date(session.updatedAt).getTime() <= 30 * 24 * 60 * 60 * 1000;

      if (isCompleted) {
        acc[session.receiverEmail] = (acc[session.receiverEmail] || 0) + 1;
      }
      if (completedRecently) {
        acc[`${session.receiverEmail}-recent`] =
          (acc[`${session.receiverEmail}-recent`] || 0) + 1;
      }
      return acc;
    }, {});

    const rows = usersList
      .filter((u) => (u.skillsIHave || []).length) // mentors
      .map((u) => {
        const ratings = u.ratings || [];
        const avg =
          ratings.length > 0
            ? (
                ratings.reduce((sum, r) => sum + Number(r.score ?? r.rating ?? 0), 0) /
                ratings.length
              ).toFixed(2)
            : "N/A";
        return {
          name: u.name,
          email: u.email,
          skills: u.skillsIHave || [],
          badges: (u.badges || []).filter(Boolean),
          badgeCount: (u.badges || []).filter(Boolean).length,
          avgRating: avg,
          completed: completedByEmail[u.email] || 0,
          completedRecent: completedByEmail[`${u.email}-recent`] || 0,
        };
      })
      .sort((a, b) => {
        const aRating = a.avgRating === "N/A" ? 0 : Number(a.avgRating);
        const bRating = b.avgRating === "N/A" ? 0 : Number(b.avgRating);
        if (bRating !== aRating) return bRating - aRating;
        if (b.badgeCount !== a.badgeCount) return b.badgeCount - a.badgeCount;
        return b.completed - a.completed;
      })
      .slice(0, 20);

    setMentorRows(rows);
  };

  const createAnnouncement = async () => {
    const { message, startAt, endAt } = announcementForm;
    if (!message || !startAt || !endAt) return alert("Please fill message, start and end time");
    const res = await fetch(`${API}/admin/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, startAt, endAt, active: true }),
    });
    if (!res.ok) return alert("Could not create announcement");
    const saved = await res.json();
    setAnnouncements((prev) => [saved, ...prev]);
    setAnnouncementForm({ message: "", startAt: "", endAt: "" });
    window.dispatchEvent(new Event("announcements-updated"));
  };

  const toggleAnnouncement = async (id, active) => {
    const res = await fetch(`${API}/admin/announcements/${id}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) return alert("Could not update announcement");
    await fetchAnnouncements();
    window.dispatchEvent(new Event("announcements-updated"));
  };

  const deleteAnnouncement = async (id) => {
    const res = await fetch(`${API}/admin/announcements/${id}`, { method: "DELETE" });
    if (!res.ok) return alert("Could not delete announcement");
    await fetchAnnouncements();
    window.dispatchEvent(new Event("announcements-updated"));
  };

  const deleteFeedback = async (fb) => {
    if (!fb.sessionId || !fb._id) return alert("Missing feedback identifiers");
    setDeletingFeedback(fb._id);
    try {
      const res = await fetch(`${API}/admin/ratings/${fb.sessionId}/${fb._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setFeedbacks((prev) => prev.filter((f) => f._id !== fb._id));
      setRatingTrend((prev) =>
        prev // recompute quick: remove entry's score from its day
          .map((d) => d)
      );
    } catch (err) {
      alert("Could not delete feedback");
    } finally {
      setDeletingFeedback(null);
    }
  };

  useEffect(() => {
    loadData();
    const tick = setInterval(() => setNow(Date.now()), 5 * 1000);
    return () => clearInterval(tick);
  }, [loadData]);

  const logout = () => setUser(null);

  const staleSessions = sessions.filter((s) => {
    const status = (s.status || "").toLowerCase();
    if (status !== "pending") return false;
    if (!s.timestamp) return false;
    const ageMs = Date.now() - new Date(s.timestamp).getTime();
    return ageMs > 24 * 60 * 60 * 1000;
  });

  /* ================= USER ACTIONS ================= */

  const deactivate = async (email) => {
    try {
      await fetch(`${API}/admin/user/${email}/deactivate`, { method: "PATCH" });
      setUsers((prev) =>
        prev.map((u) => (u.email === email ? { ...u, blocked: true } : u))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const activate = async (email) => {
    try {
      await fetch(`${API}/admin/user/${email}/activate`, { method: "PATCH" });
      setUsers((prev) =>
        prev.map((u) => (u.email === email ? { ...u, blocked: false } : u))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const resetPassword = async (email) => {
    if (!password) return alert("Enter new password");
    await fetch(`${API}/admin/user/${email}/reset-password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setPassword("");
    alert("Password updated");
  };

  /* ================= SESSION ACTIONS ================= */

  const cancelSession = async (id) => {
    await fetch(`${API}/admin/session/${id}/cancel`, { method: "PATCH" });
    loadData();
  };

  const deleteSession = async (id) => {
    if (!window.confirm("Delete this session permanently?")) return;
    await fetch(`${API}/sessions/${id}`, { method: "DELETE" });
    loadData();
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-950/70 border-r border-slate-800/80 p-6 flex flex-col justify-between backdrop-blur">
        <div className="space-y-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Control</p>
            <h1 className="text-2xl font-semibold text-emerald-300 mt-2">Admin Panel</h1>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Logged in</p>
            <p className="text-sm font-medium text-slate-100">{user?.email}</p>
          </div>
        </div>
        <Button color="red" onClick={logout}>
          Logout
        </Button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-8">
        <header className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-slate-100">Dashboard</h2>
          <p className="text-sm text-slate-400 max-w-2xl">
            A concise view of platform health, users, and active sessions. Adjusted for clarity and consistent styling.
          </p>
        </header>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
          <Card title="Total Users" value={stats.totalUsers || 0} />
          <Card title="Pending Requests" value={stats.pendingRequests || 0} />
          <Card title="Active Users" value={stats.activeUsers || 0} />
          <Card title="Blocked Users" value={stats.blockedUsers || 0} />
        </div>

        {/* TAB SWITCHER */}
        <div className="flex flex-wrap gap-2 border border-slate-800 rounded-xl bg-slate-900/70 px-2 py-2 shadow-md shadow-black/10">
          {[
            { key: "users", label: "Users" },
            { key: "sessions", label: "Sessions" },
            { key: "statuses", label: "Statuses" },
            { key: "feedback", label: "Feedback" },
            { key: "mentors", label: "Top Mentors" },
            { key: "announcements", label: "Announcements" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-900/50"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        {activeTab === "users" && (
          <section className="bg-slate-900/70 rounded-2xl border border-slate-800 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="font-semibold text-lg text-slate-100">User Management</h3>
                <p className="text-sm text-slate-400">Reset passwords, block or reactivate users</p>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="text-slate-300 bg-slate-900/60">
                <tr>
                  <th className="p-4 text-left font-semibold">Name</th>
                  <th className="text-left font-semibold">Email</th>
                  <th className="text-left font-semibold">Reset</th>
                  <th className="text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr
                    key={u.email}
                    className="hover:bg-slate-800/60 transition-colors"
                  >
                    <td className="p-4 font-medium text-slate-100">{u.name}</td>
                    <td className="text-slate-200">{u.email}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <input
                          className="bg-slate-800 border border-slate-700 focus:border-emerald-400 focus:outline-none px-3 py-1 rounded-lg text-sm text-slate-100 placeholder-slate-500"
                          placeholder="New password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button color="yellow" onClick={() => resetPassword(u.email)}>
                          Reset
                        </Button>
                      </div>
                    </td>
                    <td>
                      {u.blocked ? (
                        <Button color="green" onClick={() => activate(u.email)}>
                          Activate
                        </Button>
                      ) : (
                        <Button color="red" onClick={() => deactivate(u.email)}>
                          Deactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeTab === "sessions" && (
          <section className="bg-slate-900/70 rounded-2xl border border-slate-800 shadow-lg shadow-black/20">
            <div className="flex justify-between items-center p-5 border-b border-slate-800">
              <div>
                <h3 className="font-semibold text-lg text-slate-100">Session Control</h3>
                <p className="text-sm text-slate-400">Manage live and pending session states</p>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="text-slate-300 bg-slate-900/60">
                <tr>
                  <th className="p-3 text-left font-semibold">ID</th>
                  <th className="text-left font-semibold">Users</th>
                  <th className="text-left font-semibold">Status</th>
                  <th className="text-right pr-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sessions.map((s) => (
                  <tr
                    key={s._id}
                    className="hover:bg-slate-800/60 transition-colors"
                  >
                    <td className="p-3 font-mono text-slate-200">{s._id.slice(-6)}</td>
                    <td>
                      <div className="flex flex-col leading-tight">
                        <span className="text-slate-100">{s.senderEmail}</span>
                        <span className="text-slate-500 text-xs">→ {s.receiverEmail}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center ${statusStyle(
                          s.status
                        )}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="text-right pr-4 space-x-2">
                      <Button color="yellow" onClick={() => cancelSession(s._id)}>
                        Cancel
                      </Button>
                      <Button color="red" onClick={() => deleteSession(s._id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeTab === "statuses" && (
          <section className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6 shadow-lg shadow-black/20 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg text-slate-100">Sessions by Status</h3>
                <p className="text-sm text-slate-400">Snapshot of active, pending, and resolved sessions</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300">
                {sessionStats.reduce((t, s) => t + s.count, 0)} total
              </span>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">SLA alerts</h4>
                  <p className="text-xs text-slate-400">Pending > 24 hours (needs action)</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${staleSessions.length ? "bg-amber-900/60 text-amber-100 border border-amber-700" : "bg-emerald-900/50 text-emerald-100 border border-emerald-700"}`}>
                  {staleSessions.length} cases
                </span>
              </div>
              {staleSessions.length ? (
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                  {staleSessions.map((s) => (
                    <div
                      key={s._id}
                      className="flex items-center justify-between bg-slate-900/70 border border-slate-800 rounded-lg px-3 py-2"
                    >
                      <div className="text-sm text-slate-200">
                        <div className="font-semibold">{s.receiverEmail}</div>
                        <div className="text-xs text-slate-400">
                          From: {s.senderEmail} • Age: {formatAge(s.timestamp)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button color="yellow" onClick={() => cancelSession(s._id)}>
                          Cancel
                        </Button>
                        <Button color="red" onClick={() => deleteSession(s._id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-300 mt-2">All pending items are within SLA.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded-full border border-emerald-800 bg-emerald-900/40 text-emerald-200">
                Accepted / Active / Complete
              </span>
              <span className="px-2 py-1 rounded-full border border-amber-800 bg-amber-900/40 text-amber-200">
                Pending
              </span>
              <span className="px-2 py-1 rounded-full border border-rose-800 bg-rose-900/40 text-rose-200">
                Rejected / Cancelled
              </span>
            </div>
            {sessionStats.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={sessionStats}
                  margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                >
                  <XAxis dataKey="status" tick={{ fill: "#94a3b8" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "#94a3b8" }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: 12,
                      border: "1px solid #1e293b",
                    }}
                    labelStyle={{ color: "#e2e8f0" }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                  <Bar dataKey="count" barSize={24} radius={[6, 6, 0, 0]}>
                    {sessionStats.map((s, idx) => (
                      <Cell key={`cell-${s.status}-${idx}`} fill={statusColor(s.status)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400">No session activity yet.</p>
            )}
          </section>
        )}

        {activeTab === "feedback" && (
          <section className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6 shadow-lg shadow-black/20 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-lg text-slate-100">Feedback & Ratings</h3>
                <p className="text-sm text-slate-400">
                  Track quality through user ratings and comments.
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300">
                {feedbacks.length} feedbacks
              </span>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-slate-200 mb-3">Average rating by day</h4>
              {ratingTrend.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={ratingTrend} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} />
                    <YAxis
                      allowDecimals
                      domain={[0, 5]}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderRadius: 12,
                        border: "1px solid #1e293b",
                      }}
                      labelStyle={{ color: "#e2e8f0" }}
                      itemStyle={{ color: "#34d399" }}
                      formatter={(value) => [`${value}★`, "Average"]}
                    />
                    <Bar dataKey="avg" fill="#34d399" barSize={20} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-sm">No ratings yet.</p>
              )}
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <h4 className="text-sm font-semibold text-slate-200">Recent feedback</h4>
                <span className="text-[11px] text-slate-400">Most recent first</span>
              </div>
              <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
                {feedbacks.length ? (
                  feedbacks
                    .slice()
                    .reverse()
                    .map((f, idx) => {
                      const score = f.score ?? f.rating ?? "N/A";
                      const comment = f.feedback ?? f.comment;
                      return (
                        <div key={idx} className="px-4 py-3 flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <div className="text-sm font-semibold text-slate-100">
                              {f.fromName || f.fromEmail || "Anonymous"}
                            </div>
                            <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                              {score}★
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            For: {f.toName || f.toEmail || "Unknown user"}
                            {f.createdAt
                              ? ` • ${new Date(f.createdAt).toLocaleDateString()}`
                              : ""}
                          </div>
                          {comment ? (
                            <p className="text-sm text-slate-200 leading-snug">{comment}</p>
                          ) : (
                            <p className="text-xs text-slate-500">No comment provided.</p>
                          )}
                          <div className="flex gap-2 mt-1">
                            <button
                              disabled={deletingFeedback === f._id}
                              onClick={() => deleteFeedback(f)}
                              className="text-xs px-2 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                              {deletingFeedback === f._id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="px-4 py-3 text-slate-400 text-sm">No feedback submitted yet.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "mentors" && (
          <section className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6 shadow-lg shadow-black/20 space-y-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-semibold text-lg text-slate-100">Top Mentors</h3>
                <p className="text-sm text-slate-400">
                  Highest-rated mentors with badges and recent completions.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <select
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2"
                >
                  <option value="all">All skills</option>
                  {Array.from(
                    new Set(
                      mentorRows.flatMap((m) => m.skills || [])
                    )
                  ).map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <label className="text-slate-400">Min rating</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={minRatingFilter}
                    onChange={(e) => setMinRatingFilter(Number(e.target.value) || 0)}
                    className="w-20 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-2 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-300 bg-slate-900/60">
                  <tr>
                    <th className="p-3 text-left font-semibold">Name</th>
                    <th className="text-left font-semibold">Skills</th>
                    <th className="text-left font-semibold">Badges</th>
                    <th className="text-left font-semibold">Avg Rating</th>
                    <th className="text-left font-semibold">Completed (30d)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {mentorRows
                    .filter((m) => {
                      const ratingNum = m.avgRating === "N/A" ? 0 : Number(m.avgRating);
                      const skillMatch =
                        skillFilter === "all" || (m.skills || []).includes(skillFilter);
                      return skillMatch && ratingNum >= minRatingFilter;
                    })
                    .map((m) => (
                      <tr key={m.email} className="hover:bg-slate-800/60 transition-colors">
                        <td className="p-3 text-slate-100 font-medium">{m.name}</td>
                        <td className="text-slate-200">
                          {m.skills && m.skills.length ? m.skills.join(", ") : "—"}
                        </td>
                        <td className="text-slate-200">
                          {m.badgeCount > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {m.badges.slice(0, 3).map((badge, idx) => {
                                const { icon, color } = badgeChip(badge || "");
                                return (
                                  <span
                                    key={`${m.email}-badge-${idx}`}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}
                                  >
                                    <span>{icon}</span>
                                    <span className="capitalize">{badge}</span>
                                  </span>
                                );
                              })}
                              {m.badgeCount > 3 && (
                                <span className="text-xs text-slate-400">
                                  +{m.badgeCount - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                        <td className="text-slate-200">
                          {m.avgRating === "N/A" ? "N/A" : `${m.avgRating}★`}
                        </td>
                        <td className="text-slate-200">{m.completedRecent} / {m.completed}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!mentorRows.length && (
              <p className="text-slate-400 text-sm">No mentors found yet.</p>
            )}
          </section>
        )}

        {activeTab === "announcements" && (
          <section className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6 shadow-lg shadow-black/20 space-y-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-semibold text-lg text-slate-100">Announcements</h3>
                <p className="text-sm text-slate-400">Post site-wide notices with start/end time.</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300">
                {announcements.length} total
              </span>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold text-slate-200">Create announcement</h4>
              <div className="grid md:grid-cols-3 gap-3">
                <input
                  className="md:col-span-3 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2"
                  placeholder="Message (shown to all users)"
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm((f) => ({ ...f, message: e.target.value }))}
                />
                <div className="flex flex-col text-slate-200 text-sm gap-1">
                  <label className="text-xs text-slate-400">Start</label>
                  <input
                    type="datetime-local"
                    className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2"
                    value={announcementForm.startAt}
                    onChange={(e) => setAnnouncementForm((f) => ({ ...f, startAt: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col text-slate-200 text-sm gap-1">
                  <label className="text-xs text-slate-400">End</label>
                  <input
                    type="datetime-local"
                    className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2"
                    value={announcementForm.endAt}
                    onChange={(e) => setAnnouncementForm((f) => ({ ...f, endAt: e.target.value }))}
                  />
                </div>
                <div className="flex items-end">
                  <Button color="green" onClick={createAnnouncement}>
                    Publish
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <h4 className="text-sm font-semibold text-slate-200">Scheduled & past</h4>
                <span className="text-[11px] text-slate-400">Most recent first</span>
              </div>
              <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
                {announcements.length ? (
                  announcements.map((a) => (
                    <div key={a._id} className="px-4 py-3 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-100 font-medium">{a.message}</p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full border ${
                            a.active
                              ? "bg-emerald-900/50 text-emerald-100 border-emerald-700"
                              : "bg-slate-800 text-slate-300 border-slate-700"
                          }`}
                        >
                          {a.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {a.startAt ? new Date(a.startAt).toLocaleString() : "N/A"} →{" "}
                        {a.endAt ? new Date(a.endAt).toLocaleString() : "N/A"}
                      </div>
                      <div className="flex gap-2">
                        {a.active ? (
                          <Button color="gray" onClick={() => toggleAnnouncement(a._id, false)}>
                            Deactivate
                          </Button>
                        ) : (
                          <>
                            {(!a.endAt || new Date(a.endAt) > now) && (
                              <Button color="green" onClick={() => toggleAnnouncement(a._id, true)}>
                                Activate
                              </Button>
                            )}
                            <Button color="red" onClick={() => deleteAnnouncement(a._id)}>
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-3 text-slate-400 text-sm">No announcements yet.</p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
