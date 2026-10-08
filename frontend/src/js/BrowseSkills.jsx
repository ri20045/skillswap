import React, { useEffect, useState } from "react";
import { useToast } from "./ToastProvider";

const BrowseSkills = ({ user }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [skillFilter, setSkillFilter] = useState("all");
  const [allUsers, setAllUsers] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [goldCounts, setGoldCounts] = useState({});
  const [profileModal, setProfileModal] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (!user?.email) return;
    fetch(`http://localhost:4000/api/match/${user.email}`)
      .then((res) => res.json())
      .then((data) => {
        setAllUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.email]);

  useEffect(() => {
    fetch("http://localhost:4000/api/ratings")
      .then((res) => res.json())
      .then((data) => {
        setRatings(data);
        const counts = {};
        data.forEach((r) => {
          if (r.badge && r.badge.toLowerCase() === "gold" && r.toEmail) {
            counts[r.toEmail] = (counts[r.toEmail] || 0) + 1;
          }
        });
        setGoldCounts(counts);
      })
      .catch(() => {
        setRatings([]);
        setGoldCounts({});
      });
  }, []);

  const allSkills = Array.from(
    new Set(allUsers.flatMap((u) => u.skillsIHave || []))
  ).sort((a, b) => a.localeCompare(b));

  const ratingFor = (email) => {
    const r = ratings.filter((x) => x.toEmail === email);
    if (!r.length) return { avg: null, count: 0, badges: [], feedbacks: [] };
    const total = r.reduce((sum, item) => sum + (item.score || 0), 0);
    const badges = r.filter((x) => x.badge).map((x) => x.badge);
    return {
      avg: total / r.length,
      count: r.length,
      badges,
      feedbacks: r.map((x) => ({
        score: x.score,
        feedback: x.feedback,
        fromEmail: x.fromEmail,
        createdAt: x.createdAt,
      })),
    };
  };

  const filtered = allUsers.filter((person) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesText = term === "" || person.name.toLowerCase().includes(term);
    const matchesSkill =
      skillFilter === "all" ||
      person.skillsIHave.some((s) => s.toLowerCase() === skillFilter.toLowerCase());
    const hasSkills = Array.isArray(person.skillsIHave) && person.skillsIHave.length > 0;
    return matchesText && matchesSkill && hasSkills;
  });

  const recommended = allUsers
    .filter((p) => goldCounts[p.email] > 0)
    .sort((a, b) => goldCounts[b.email] - goldCounts[a.email])
    .slice(0, 6);

  const withMatchesSorted = filtered
    .map((p) => {
      const wants = (user?.skillsIWant || []).map((x) => x?.toLowerCase?.() || x);
      const matchesInterest = (p.skillsIHave || []).some((s) => wants.includes(s?.toLowerCase?.()));
      return { person: p, matchesInterest };
    })
    .sort((a, b) => Number(b.matchesInterest) - Number(a.matchesInterest));

  const Card = ({ person }) => {
    const meta = ratingFor(person.email);
    return (
      <div className="relative rounded-3xl border border-blue-500/20 bg-[#050915] p-6 text-white shadow-[0_15px_50px_rgba(0,0,0,0.35)]">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-2xl font-black uppercase tracking-wide">{person.name}</p>
            <p className="text-blue-300 text-sm">{person.email}</p>
          </div>
          {person.isPerfectMatch && (
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-700/50 text-emerald-200 border border-emerald-400/40">
              PERFECT MATCH
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-lg text-amber-300 mb-4">
          <span>⭐</span>
          <span>{meta.avg ? meta.avg.toFixed(1) : "0.0"}</span>
          <span className="text-blue-300 text-sm">({meta.count} reviews)</span>
          {goldCounts[person.email] ? (
            <span className="text-amber-200 text-sm">🏅 {goldCounts[person.email]}</span>
          ) : null}
        </div>

        <div className="mb-4">
          <p className="text-xs text-cyan-200 font-black tracking-[0.2em] mb-2">
            THEY CAN TEACH YOU
          </p>
          <div className="flex flex-wrap gap-2">
            {person.skillsIHave.map((s) => (
              <span
                key={s}
                className="px-3 py-1 rounded-full bg-cyan-900/50 text-cyan-100 border border-cyan-500/40 text-sm"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs text-purple-200 font-black tracking-[0.2em] mb-2">
            THEY WANT TO LEARN
          </p>
          <div className="flex flex-wrap gap-2">
            {(person.skillsIWant || []).map((s) => (
              <span
                key={s}
                className="px-3 py-1 rounded-full bg-purple-900/50 text-purple-100 border border-purple-500/40 text-sm"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <button
            onClick={() => setProfileModal({ person, meta })}
            className="w-full text-center px-4 py-3 rounded-xl bg-white/5 border border-white/10 font-black tracking-widest text-sm hover:border-cyan-400"
          >
            VIEW PROFILE
          </button>
          <button
            onClick={() =>
              setPendingRequest({
                email: person.email,
                name: person.name,
                skill: person.skillsIHave[0] || "",
                message: "",
              })
            }
            className="w-full text-center px-4 py-3 rounded-xl bg-blue-600 text-white font-black tracking-widest text-sm hover:bg-cyan-500"
          >
            SEND REQUEST
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden p-8">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#1e3a8a 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        {/* Search / Filters */}
        <div className="bg-gray-900/70 border border-blue-500/20 rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-3xl font-black">Browse Mentors</p>
            <p className="text-blue-300/70 text-sm">Find people who can teach you.</p>
          </div>
          <p className="text-[12px] text-blue-300/70">
            Matched mentors are highlighted. Keep your “Want to learn” skills updated in Profile.
          </p>
          {recommended.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-lg font-black text-cyan-200 tracking-wide">
                  Recommended Mentors
                </p>
                <span className="text-xs text-blue-300/80">
                  Based on gold badges
                </span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1 pr-1">
                {recommended.map((p) => {
                  const meta = ratingFor(p.email);
                  return (
                    <div
                      key={p.email}
                      className="min-w-[260px] rounded-2xl bg-[#0b1224] border border-amber-400/30 p-4 text-white flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-black text-lg">{p.name}</p>
                          <p className="text-xs text-blue-300">{p.email}</p>
                        </div>
                        <span className="px-2 py-1 rounded-full text-[11px] bg-amber-500/20 text-amber-100 border border-amber-400/40">
                          🏅 {goldCounts[p.email]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-amber-200">
                        ⭐ {meta.avg ? meta.avg.toFixed(1) : "0.0"} ({meta.count})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(p.skillsIHave || []).slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className="px-2 py-1 rounded-full bg-cyan-900/50 text-cyan-100 border border-cyan-500/40 text-xs"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setProfileModal({ person: p, meta })}
                          className="flex-1 text-xs font-black tracking-widest bg-white/5 border border-white/10 rounded-lg py-2 hover:border-cyan-400"
                        >
                          VIEW
                        </button>
                        <button
                          onClick={() =>
                            setPendingRequest({
                              email: p.email,
                              name: p.name,
                              skill: p.skillsIHave?.[0] || "",
                              message: "",
                            })
                          }
                          className="flex-1 text-xs font-black tracking-widest bg-blue-600 rounded-lg py-2 hover:bg-cyan-500"
                        >
                          REQUEST
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-[11px] uppercase text-blue-400 font-bold tracking-widest mb-1 block">
                Search by name
              </label>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type a name..."
                className="w-full bg-black/60 border border-blue-500/20 rounded-xl pl-10 pr-3 py-3 text-base outline-none focus:border-cyan-400"
              />
              <span className="absolute left-3 bottom-3 text-blue-400">🔍</span>
            </div>
            <div>
              <label className="text-[11px] uppercase text-blue-400 font-bold tracking-widest mb-1 block">
                Filter by skill (they can teach)
              </label>
              <select
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                className="w-full bg-black/60 border border-blue-500/20 rounded-xl px-3 py-3 text-base outline-none focus:border-cyan-400"
              >
                <option value="all">All skills</option>
                {allSkills.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center text-blue-300 py-16">Loading mentors...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-blue-300 py-16">No users match your filters.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {withMatchesSorted.map(({ person, matchesInterest }) => (
              <div key={person.email} className="space-y-2">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border ${
                    matchesInterest
                      ? "bg-emerald-500/15 text-emerald-100 border-emerald-400/30"
                      : "bg-white/5 text-blue-200 border-white/10"
                  }`}
                >
                  {matchesInterest ? "Matches your interests" : "Explore other mentors"}
                </span>
                <Card person={person} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request modal */}
      {pendingRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-blue-500/30 rounded-2xl w-full max-w-md p-6 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-lg font-black text-white">Request Skill Swap</p>
              <button onClick={() => setPendingRequest(null)} className="text-blue-200 hover:text-white text-sm">✕</button>
            </div>
            <div className="space-y-2 text-sm text-blue-200">
              <p><span className="text-blue-100 font-bold">To:</span> {pendingRequest.name} ({pendingRequest.email})</p>
              <label className="text-[11px] uppercase text-blue-300 font-bold">Skill</label>
              <input
                value={pendingRequest.skill}
                onChange={(e) => setPendingRequest((p) => ({ ...p, skill: e.target.value }))}
                className="w-full bg-black/50 border border-blue-500/30 rounded-xl p-2 text-white"
                placeholder="Skill you want to learn"
              />
              <label className="text-[11px] uppercase text-blue-300 font-bold">Message (optional)</label>
              <textarea
                value={pendingRequest.message || ""}
                onChange={(e) => setPendingRequest((p) => ({ ...p, message: e.target.value }))}
                className="w-full bg-black/50 border border-blue-500/30 rounded-xl p-2 text-white h-20"
                placeholder="Add a short note"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingRequest(null)}
                className="px-4 py-2 text-blue-200 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                disabled={requesting}
                onClick={async () => {
                  if (!pendingRequest.skill) {
                    toast("Pick a skill for the request", "error");
                    return;
                  }
                  setRequesting(true);
                  try {
                    const res = await fetch("http://localhost:4000/api/sessions", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        senderEmail: user.email,
                        senderName: user.name,
                        receiverEmail: pendingRequest.email,
                        skill: pendingRequest.skill,
                        message: pendingRequest.message || "",
                      }),
                    });
                    if (!res.ok) throw new Error("Request failed");
                    toast("Request sent", "success");
                    setPendingRequest(null);
                  } catch (err) {
                    console.error(err);
                    toast("Could not send request", "error");
                  } finally {
                    setRequesting(false);
                  }
                }}
                className="px-4 py-2 bg-cyan-400 text-black font-black text-xs rounded-lg disabled:opacity-50"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile modal */}
      {profileModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-[#0b1224] border border-blue-500/30 rounded-[28px] p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.5)] space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-3xl font-black uppercase">{profileModal.person.name}</p>
                <p className="text-blue-300 text-sm">{profileModal.person.email}</p>
                <div className="flex items-center gap-2 mt-3 text-lg text-amber-300">
                  <span>⭐</span>
                  <span>{profileModal.meta.avg ? profileModal.meta.avg.toFixed(1) : "0.0"}</span>
                  <span className="text-blue-300 text-sm">
                    ({profileModal.meta.count} {profileModal.meta.count === 1 ? "review" : "reviews"})
                  </span>
                </div>
                {goldCounts[profileModal.person.email] ? (
                  <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-300/60 text-amber-100 font-bold text-base">
                    <span className="text-xl">🏅</span>
                    <span className="tracking-wide">x{goldCounts[profileModal.person.email]}</span>
                  </div>
                ) : null}
              </div>
              <button
                onClick={() => setProfileModal(null)}
                className="text-blue-200 hover:text-white text-lg font-black"
              >
                CLOSE
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-[11px] uppercase text-cyan-200 font-black tracking-[0.25em] mb-2">
                  They can teach you
                </p>
                <div className="flex flex-wrap gap-2">
                  {(profileModal.person.skillsIHave || []).map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1 rounded-full bg-cyan-900/60 text-cyan-100 border border-cyan-500/40 text-sm"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase text-purple-200 font-black tracking-[0.25em] mb-2">
                  They want to learn
                </p>
                <div className="flex flex-wrap gap-2">
                  {(profileModal.person.skillsIWant || []).map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1 rounded-full bg-purple-900/60 text-purple-100 border border-purple-500/40 text-sm"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-3xl p-5">
              <p className="text-[11px] uppercase text-blue-300 font-black tracking-[0.25em] mb-3">
                Feedback
              </p>
              {profileModal.meta.feedbacks.length === 0 ? (
                <p className="text-blue-300/70 text-sm">No feedback yet.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {profileModal.meta.feedbacks.map((f, idx) => {
                    const when = f.createdAt ? new Date(f.createdAt) : null;
                    const formatted = when
                      ? `${String(when.getDate()).padStart(2, "0")}/${String(
                          when.getMonth() + 1
                        ).padStart(2, "0")}/${when.getFullYear()}`
                      : "";
                    return (
                      <div
                        key={idx}
                        className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between text-sm text-amber-200">
                          <span>⭐ {f.score ? `${f.score}/5` : "—"}</span>
                          {formatted && <span className="text-blue-200">{formatted}</span>}
                        </div>
                        <p className="text-white text-base">{f.feedback || "No comment"}</p>
                        <p className="text-blue-300/70 text-xs">from {f.fromEmail || "anonymous"}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page corners */}
      <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-blue-500/20" />
      <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-blue-500/20" />
    </div>
  );
};

export default BrowseSkills;
