import React, { useEffect, useState, useCallback, useRef } from "react";
import { useToast } from "./ToastProvider";
import { API } from "./config";

const MySessions = ({ user }) => {
  const [sessions, setSessions] = useState([]);
  const [tab, setTab] = useState("all");
  const [replyModal, setReplyModal] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [rateModal, setRateModal] = useState(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [ratingBadge, setRatingBadge] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [meetLinks, setMeetLinks] = useState({});
  const menuRef = React.useRef(null);
  const fileInputRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [joinPreview, setJoinPreview] = useState(null);
  const [linkModal, setLinkModal] = useState(null); // { session, link }
  const [callModal, setCallModal] = useState(null); // { session }
  const [pc, setPc] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState("");
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const pollRef = useRef(null);
  const videoSenderRef = useRef(null);
  const audioSenderRef = useRef(null);
  const toast = useToast();
  const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  useEffect(() => {
    const localVideoEl = document.getElementById("local-video");
    if (localVideoEl && localStream) {
      localVideoEl.srcObject = localStream;
    }
    const remoteVideoEl = document.getElementById("remote-video");
    if (remoteVideoEl && remoteStream) {
      remoteVideoEl.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  const fetchSessions = useCallback(() => {
    if (!user?.email) return;
    fetch(`${API}/sessions/${user.email}`)
      .then((res) => res.json())
      .then((data) => {
        setSessions(data);
        const links = {};
        data.forEach(s => { if (s.meetLink) links[s._id] = s.meetLink; });
        setMeetLinks(links);
      });
  }, [user?.email]);

  useEffect(() => {
    fetchSessions();
    const id = setInterval(fetchSessions, 5000); // keep in sync without manual tab switching
    return () => clearInterval(id);
  }, [fetchSessions]);

  // ---------- Simple REST-based signaling for video ----------
  const sendSignal = async (sessionId, kind, payload) => {
    await fetch(`${API}/call/${sessionId}/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
  };

  const pollSignals = async (sessionId, currentIndex, handler) => {
    const res = await fetch(
      `${API}/call/${sessionId}/messages?since=${currentIndex || 0}`,
      { cache: "no-store" }
    );
    if (!res.ok) return currentIndex;
    const data = await res.json();
    const messages = data.messages || [];
    for (const msg of messages) {
      await handler(msg);
    }
    return data.nextIndex ?? currentIndex;
  };

  const handleSendMessage = () => {
    fetch(`${API}/sessions/${replyModal._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: replyText,
        senderEmail: user.email,
        markRead: user.email === replyModal.receiverEmail,
      }),
    }).then(() => {
      setReplyModal(null);
      setReplyText("");
      fetchSessions();
    });
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/sessions/${id}`, { method: "DELETE" });
      toast("Chat deleted", "success");
      fetchSessions();
    } catch (err) {
      toast("Could not delete chat", "error");
    }
  };

  const handleStatusChange = async (session, status) => {
    try {
      const res = await fetch(`${API}/sessions/${session._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          senderEmail: user.email,
          markRead: user.email === session.receiverEmail,
        }),
      });
      if (!res.ok) throw new Error("status update failed");
      toast(
        status === "cancelled" ? "Request cancelled" :
        status === "accepted" ? "Request accepted" :
        status === "rejected" ? "Request rejected" :
        status === "completed" ? "Marked complete" : "Updated",
        "success"
      );
      fetchSessions();
    } catch (err) {
      toast("Could not update request", "error");
    }
  };

  const handleSubmitRating = () => {
    if (!rateModal) return;
    fetch(`${API}/sessions/${rateModal._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: {
          fromEmail: user.email,
          toEmail: rateModal.receiverEmail === user.email ? rateModal.senderEmail : rateModal.receiverEmail,
          score: ratingScore,
          feedback: ratingFeedback,
          badge: ratingBadge,
        },
      }),
    })
    .then((res) => {
      if (!res.ok) throw new Error("fail");
      toast("Feedback sent", "success");
      setRateModal(null);
      setRatingScore(5);
      setRatingFeedback("");
      setRatingBadge("");
      fetchSessions();
    })
    .catch(() => { toast("Could not send feedback", "error"); });
  };

  const sendAttachmentMessage = async (session, attachmentMeta) => {
    try {
      const res = await fetch(`${API}/sessions/${session._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderEmail: user.email,
          attachment: attachmentMeta,
          markRead: user.email === session.receiverEmail,
        }),
      });
      if (!res.ok) throw new Error("send attachment failed");
      toast("Attachment sent", "success");
      fetchSessions();
    } catch (err) { toast("Could not send attachment", "error"); }
  };

  const handleCreateMeet = async (session, regenerate = false, customLink) => {
    const meetURL = customLink?.trim();
    if (!meetURL) {
      toast("Please enter a meeting link", "error");
      return;
    }
    try {
      const res = await fetch(`${API}/sessions/${session._id}/meet/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetLink: meetURL, hostEmail: user.email }),
      });
      if (!res.ok) throw new Error("Failed to save meet link");
      setMeetLinks((prev) => ({ ...prev, [session._id]: meetURL }));
      toast(regenerate ? "Meeting link regenerated" : "Meeting link created", "success");
      fetchSessions();
      setLinkModal(null);
    } catch (err) {
      console.error(err);
      toast("Could not create meeting. Try again.", "error");
    }
  };

  const handleRequestMeet = async (session) => {
    try {
      const res = await fetch(`${API}/sessions/${session._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${user.email} requested a meeting link.`,
          senderEmail: user.email,
          markRead: session.receiverEmail === user.email,
        }),
      });
      if (!res.ok) throw new Error("request failed");
      toast("Requested a meeting link from mentor", "success");
      fetchSessions();
    } catch (err) {
      toast("Could not send request", "error");
    }
  };

  const handleMeet = async (session) => {
    const status = (session.status || "").toLowerCase();
    const allowed = ["accepted", "active"];
    if (!allowed.includes(status)) {
      toast("Meeting available once the session is accepted/active.", "error");
      return;
    }
    const isMentor = session.receiverEmail === user.email;
    const existingLink = meetLinks[session._id] || session.meetLink;
    if (existingLink) {
      setJoinPreview(existingLink);
      return;
    }
    if (isMentor) {
      setLinkModal({ session, link: "" });
    } else {
      handleRequestMeet(session);
    }
  };

  // ---------- WebRTC call (beta) ----------
  const closeCall = () => {
    if (callModal?.session) {
      sendSignal(callModal.session._id, "end", {});
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.getSenders().forEach((s) => s.track && s.track.stop());
      pc.close();
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    videoSenderRef.current = null;
    audioSenderRef.current = null;
    setPc(null);
    setLocalStream(null);
    setRemoteStream(null);
    setCallModal(null);
    setCallStatus("");
    setCamOn(true);
    setMicOn(true);
  };

  const startCall = async (session) => {
    try {
      setCallModal({ session });
      setCallStatus("Starting…");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setLocalStream(stream);
      setCamOn(true);
      setMicOn(true);

      const newPc = new RTCPeerConnection(ICE);
      stream.getTracks().forEach((t) => {
        const sender = newPc.addTrack(t, stream);
        if (t.kind === "video") videoSenderRef.current = sender;
        if (t.kind === "audio") audioSenderRef.current = sender;
      });
      setPc(newPc);

      newPc.onicecandidate = (e) => {
        if (e.candidate) {
          sendSignal(session._id, "candidate", { candidate: e.candidate });
        }
      };
      newPc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
      };
      newPc.onconnectionstatechange = () => {
        const st = newPc.connectionState;
        if (st === "failed" || st === "disconnected" || st === "closed") {
          closeCall();
        }
      };

      setPc(newPc);
      let idx = 0;

      // If no offer exists, create one
      const msgs = await fetch(
        `${API}/call/${session._id}/messages?since=0`
      ).then((r) => r.json());
      idx = msgs.nextIndex || 0;
      const offers = (msgs.messages || []).filter((m) => m.type === "offer");

      if (!offers.length) {
        setCallStatus("Sending offer…");
        const offer = await newPc.createOffer();
        await newPc.setLocalDescription(offer);
        await sendSignal(session._id, "offer", { sdp: offer });
      } else {
        const offerMsg = offers[offers.length - 1];
        await newPc.setRemoteDescription(new RTCSessionDescription(offerMsg.payload.sdp));
        const answer = await newPc.createAnswer();
        await newPc.setLocalDescription(answer);
        await sendSignal(session._id, "answer", { sdp: answer });
        setCallStatus("Answered");
      }

      // Poll loop
      pollRef.current = setInterval(async () => {
        if (!pc && !newPc) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          return;
        }
        idx = await pollSignals(session._id, idx, async (msg) => {
          if (msg.type === "offer" && newPc.signalingState === "stable") {
            await newPc.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
            const answer = await newPc.createAnswer();
            await newPc.setLocalDescription(answer);
            await sendSignal(session._id, "answer", { sdp: answer });
            setCallStatus("Answered");
          } else if (msg.type === "answer" && newPc.signalingState === "have-local-offer") {
            await newPc.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
            setCallStatus("Connected");
          } else if (msg.type === "candidate" && msg.payload?.candidate) {
            try {
              await newPc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate));
            } catch (err) {
              console.error("ICE add failed", err);
            }
          } else if (msg.type === "end") {
            closeCall();
          }
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      toast("Could not start call", "error");
      closeCall();
    }
  };

  const handleUpload = async (file, session) => {
    if (!file || !session) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/uploads`, { method: "POST", body: form });
      if (!res.ok) throw new Error("upload failed");
      const meta = await res.json();
      await sendAttachmentMessage(session, meta);
    } catch (err) { toast("Upload failed", "error"); } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploadTarget(null);
    }
  };

  const counts = sessions.reduce((acc, s) => {
    const st = (s.status || "pending").toLowerCase();
    acc[st] = (acc[st] || 0) + 1;
    acc.all = (acc.all || 0) + 1;
    return acc;
  }, {});

  const statusTabs = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "accepted", label: "Accepted" },
    { id: "completed", label: "Completed" },
    { id: "rejected", label: "Rejected" },
  ].map((t) => ({ ...t, count: counts[t.id] || 0 }));

  const filteredSessions = sessions
    .filter((s) => tab === "all" ? true : (s.status || "pending").toLowerCase() === tab)
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  const statusBadge = (status) => {
    const st = (status || "pending").toLowerCase();
    const map = {
      pending: "text-amber-300 bg-amber-500/10",
      accepted: "text-emerald-300 bg-emerald-500/10",
      active: "text-emerald-300 bg-emerald-500/10",
      completed: "text-gray-200 bg-gray-500/10",
      rejected: "text-red-300 bg-red-500/10",
      cancelled: "text-slate-200 bg-slate-500/15",
    };
    return map[st] || "text-blue-300 bg-blue-500/10";
  };

  return (
    <div className="min-h-screen bg-[#020617] p-8 text-white font-sans">
      <style>{`@keyframes slidePop {0% { opacity: 0; transform: translateY(8px) scale(0.96); }100% { opacity: 1; transform: translateY(0) scale(1); }}`}</style>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black tracking-widest uppercase">Manage Requests</h2>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,.json,.zip,.doc,.docx,.ppt,.pptx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && uploadTarget) handleUpload(file, uploadTarget);
            else if (file) { toast("Select a session to attach", "error"); e.target.value = ""; }
          }}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {statusTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-lg text-sm font-bold border transition ${
              tab === t.id ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_8px_24px_rgba(34,211,238,0.25)]" :
              "bg-white/5 text-blue-100 border-blue-500/20 hover:border-cyan-400 hover:bg-cyan-500/10"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {filteredSessions.length === 0 ? (
        <div className="text-center text-blue-300/80 py-16 border border-blue-500/10 rounded-2xl bg-white/5">
          No requests in this view.
        </div>
      ) : (
        <div className="space-y-5">
          {filteredSessions.map((s) => {
            const isIncoming = s.receiverEmail === user.email;
            const otherUser = isIncoming ? s.senderEmail : s.receiverEmail;
            const status = (s.status || "pending").toLowerCase();
            const created = s.timestamp ? new Date(s.timestamp).toLocaleDateString() : "";
            const currentMeetLink = meetLinks[s._id] || s.meetLink;
            const canCreateMeet = ["accepted", "active"].includes(status) && isIncoming && !currentMeetLink;

            return (
              <div key={s._id} className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 relative">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-lg font-black">{s.skill || "Skill Swap"}</p>
                    <p className="text-blue-300/80 text-sm">with {otherUser} • {created}</p>
                  </div>
                  <span className={`text-[11px] font-black uppercase px-2 py-1 rounded ${statusBadge(status)}`}>{status}</span>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-sm mb-3 max-h-64 overflow-y-auto space-y-2">
                  <p className="text-blue-200 text-[11px] uppercase mb-1">Messages</p>
                  {(s.messages || []).map((m, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="flex gap-2">
                        <span className="text-blue-300 font-bold">{m.sender === user.email ? "You" : m.sender}</span>
                        {m.text && <span className="text-white/90">{m.text}</span>}
                      </div>
                      {m.attachment && (
                        <a href={m.attachment.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-blue-100 hover:border-cyan-400 w-fit">
                          📎 {m.attachment.name || "file"}
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  {status === "pending" && isIncoming && (
                    <>
                      <button onClick={() => handleStatusChange(s, "accepted")} className="px-4 py-2 bg-emerald-400 text-black font-black text-[11px] rounded-lg">Accept</button>
                      <button onClick={() => handleStatusChange(s, "rejected")} className="px-4 py-2 bg-red-500 text-black font-black text-[11px] rounded-lg">Reject</button>
                    </>
                  )}

      {(status === "accepted" || status === "active") && (
        <div className="flex flex-wrap gap-2 items-center">

                      {currentMeetLink ? (
                        <div className="flex flex-wrap gap-2 items-center">
                          <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-blue-100 flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wide text-blue-200/80">Meet link</span>
                            <span className="truncate max-w-[180px]">{currentMeetLink}</span>
              </div>
                          <button
                            onClick={() => setJoinPreview(currentMeetLink)}
                            className="px-4 py-2 bg-indigo-500 text-white font-black text-[11px] rounded-lg hover:bg-indigo-600 transition"
                          >
                            Join
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(currentMeetLink);
                              toast("Copied meeting link", "success");
                            }}
                            className="px-3 py-2 bg-white/10 border border-white/20 text-white text-[11px] rounded-lg hover:border-cyan-400 transition"
                          >
                            Copy
                          </button>
                          {isIncoming && (
                            <button
                              onClick={() => setLinkModal({ session: s, link: currentMeetLink })}
                              className="px-3 py-2 bg-white/10 border border-white/20 text-white text-[11px] rounded-lg hover:border-cyan-400 transition"
                            >
                              Regenerate
                            </button>
                          )}
            </div>
                      ) : (
                        <button
                          onClick={() => handleMeet(s)}
                          className="px-4 py-2 bg-indigo-500 text-white font-black text-[11px] rounded-lg flex items-center gap-2 hover:bg-indigo-600 transition"
                        >
                          {canCreateMeet ? "CREATE MEET" : "REQUEST LINK"}
                        </button>
                      )}

                      <button
                        onClick={() => startCall(s)}
                        className="px-4 py-2 bg-emerald-500 text-white font-black text-[11px] rounded-lg flex items-center gap-2 hover:bg-emerald-600 transition"
                      >
                        Video Call
                      </button>

                      <button
                        disabled={uploading}
                        onClick={() => { setUploadTarget(s); fileInputRef.current?.click(); }}
                        className="px-4 py-2 rounded-lg border border-blue-400/30 bg-blue-500/10 text-blue-100 font-black text-[11px] hover:border-cyan-400 disabled:opacity-50"
                      >
                        {uploading ? "Uploading..." : "📎 Attach File"}
                      </button>

                    </div>
                  )}

                  {status === "pending" && !isIncoming && (
                    <button onClick={() => handleStatusChange(s, "cancelled")} className="px-4 py-2 bg-slate-300 text-black font-black text-[11px] rounded-lg">Cancel Request</button>
                  )}

                  <div className="relative" ref={openMenu === s._id ? menuRef : null}>
                    <button onClick={() => setOpenMenu(openMenu === s._id ? null : s._id)} className="px-3 py-2 bg-white/10 border border-white/15 rounded-lg text-[11px] font-bold flex items-center gap-1">
                      More Actions ▾
                    </button>
                    {openMenu === s._id && (
                      <div className="absolute z-20 right-0 w-48 origin-bottom-right animate-[slidePop_0.18s_ease-out]" style={{ bottom: "calc(100% + 12px)" }}>
                        <div className="rounded-3xl bg-[#0b182f] border border-cyan-400/30 shadow-2xl p-2 space-y-1">
                          <button onClick={() => { setOpenMenu(null); setReplyModal(s); }} disabled={["rejected","completed","cancelled"].includes(status)} className="w-full text-left px-4 py-2 text-sm rounded-2xl bg-white/5 hover:bg-cyan-500/10 disabled:opacity-50">Reply</button>
                          <button onClick={() => { setOpenMenu(null); handleStatusChange(s, "completed"); }} disabled={status !== "accepted"} className="w-full text-left px-4 py-2 text-sm rounded-2xl bg-white/5 hover:bg-emerald-500/10 disabled:opacity-50">Mark Complete</button>
                          <button onClick={() => { setOpenMenu(null); setRateModal(s); }} disabled={status === "rejected" || status === "cancelled"} className="w-full text-left px-4 py-2 text-sm rounded-2xl bg-white/5 hover:bg-amber-500/10 disabled:opacity-50">Rate</button>
                          <button onClick={() => { setOpenMenu(null); handleDelete(s._id); }} className="w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-red-500/15 rounded-2xl">Delete Chat</button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REPLY MODAL */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-[#0f172a] border border-cyan-400/40 w-full max-w-md rounded-3xl p-8">
            <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} className="w-full h-32 bg-black/60 border border-blue-500/20 rounded-xl p-4 text-white mb-6" placeholder="Type your message..." />
            <div className="flex gap-4">
              <button onClick={() => setReplyModal(null)} className="flex-1 text-gray-500 uppercase text-[10px]">Close</button>
              <button onClick={handleSendMessage} className="flex-[2] py-3 bg-cyan-400 text-black font-black rounded-xl">SEND</button>
            </div>
          </div>
        </div>
      )}

      {/* RATE MODAL */}
      {rateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-[#0f172a] border border-amber-400/40 w-full max-w-md rounded-3xl p-8">
            <h3 className="text-xl font-black text-white mb-1 uppercase">Rate Session</h3>
            <p className="text-sm text-blue-300/70 mb-4">{rateModal.receiverEmail === user.email ? `Your mentor: ${rateModal.senderEmail}` : `Your mentee: ${rateModal.receiverEmail}`}</p>
            <label className="text-xs text-amber-200 font-bold">Score (1-5)</label>
            <input type="number" min="1" max="5" value={ratingScore} onChange={(e) => setRatingScore(Number(e.target.value))} className="w-full bg-black/60 border border-amber-400/40 rounded-xl p-3 text-white mb-4" />
            <label className="text-xs text-amber-200 font-bold">Feedback</label>
            <textarea value={ratingFeedback} onChange={(e) => setRatingFeedback(e.target.value)} className="w-full h-28 bg-black/60 border border-amber-400/40 rounded-xl p-3 text-white mb-4" placeholder="How was the session?" />
            <label className="text-xs text-amber-200 font-bold">Badge (optional)</label>
            <div className="flex gap-3 mb-4">
              {["", "gold", "silver", "bronze"].map((b) => (
                <button key={b || "none"} onClick={() => setRatingBadge(b)} className={`px-4 py-3 rounded-xl border text-base font-bold flex items-center justify-center gap-2 ${ratingBadge === b ? "border-amber-300 text-amber-100 bg-amber-500/10" : "border-amber-400/30 text-amber-100/70 bg-white/5"}`}>{b === "" ? "—" : b === "gold" ? "🥇 Gold" : b === "silver" ? "🥈 Silver" : "🥉 Bronze"}</button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setRateModal(null)} className="flex-1 text-gray-400 uppercase text-[10px]">Cancel</button>
              <button onClick={handleSubmitRating} className="flex-[2] py-3 bg-amber-400 text-black font-black rounded-xl">Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* JOIN PREVIEW MODAL */}
      {joinPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#0f172a] border border-indigo-400/40 w-full max-w-md rounded-3xl p-8 space-y-4">
            <h3 className="text-xl font-black text-white">Join meeting?</h3>
            <p className="text-sm text-blue-200/80 break-all">{joinPreview}</p>
            <p className="text-xs text-blue-300/70">
              We’ll open the link in a new tab. Use the browser’s pre-join to check camera/mic.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setJoinPreview(null)}
                className="flex-1 text-blue-200 uppercase text-[11px]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  window.open(joinPreview, "_blank");
                  setJoinPreview(null);
                }}
                className="flex-[2] py-3 bg-indigo-500 text-white font-black rounded-xl hover:bg-indigo-600"
              >
                Open meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LINK CREATE/EDIT MODAL */}
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#0f172a] border border-indigo-400/40 w-full max-w-md rounded-3xl p-8 space-y-4">
            <h3 className="text-xl font-black text-white">
              {linkModal.link ? "Update meeting link" : "Create meeting link"}
            </h3>
            <label className="text-xs text-blue-300 uppercase tracking-wide">Paste meeting URL (e.g., Google Meet)</label>
            <input
              value={linkModal.link}
              onChange={(e) => setLinkModal((m) => ({ ...m, link: e.target.value }))}
              className="w-full bg-black/60 border border-indigo-400/30 rounded-xl p-3 text-white text-sm"
              placeholder="https://meet.google.com/..."
            />
            <p className="text-[11px] text-blue-300/70">
              Create a Meet in your Google account, copy its link, and paste it here. Both participants will join this exact link.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setLinkModal(null)}
                className="flex-1 text-blue-200 uppercase text-[11px]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateMeet(linkModal.session, !!linkModal.link && linkModal.link !== (linkModal.session.meetLink || ""), linkModal.link)}
                className="flex-[2] py-3 bg-indigo-500 text-white font-black rounded-xl hover:bg-indigo-600"
              >
                Save link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIDEO CALL MODAL */}
      {callModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#0f172a] border border-emerald-400/40 w-full max-w-4xl rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white">Video Call</h3>
              <span className="text-xs text-emerald-200">{callStatus || "Connecting..."}</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative bg-black rounded-2xl overflow-hidden border border-emerald-400/20 aspect-video">
                <video id="remote-video" className="w-full h-full object-cover" autoPlay playsInline />
                {!remoteStream && (
                  <div className="absolute inset-0 flex items-center justify-center text-emerald-200 text-sm">
                    Waiting for remote...
                  </div>
                )}
                <div className="absolute top-2 left-2 text-[11px] px-2 py-1 rounded bg-black/60 text-white">
                  {callModal?.session
                    ? (callModal.session.receiverEmail === user.email
                        ? (callModal.session.senderName || callModal.session.senderEmail || "Remote")
                        : (callModal.session.receiverName || callModal.session.receiverEmail || "Remote"))
                    : "Remote"}
                </div>
              </div>
              <div className="relative bg-black rounded-2xl overflow-hidden border border-emerald-400/20 aspect-video">
                <video id="local-video" className="w-full h-full object-cover" autoPlay playsInline muted />
                {!localStream && (
                  <div className="absolute inset-0 flex items-center justify-center text-emerald-200 text-sm">
                    Camera starting...
                  </div>
                )}
                <div className="absolute top-2 left-2 text-[11px] px-2 py-1 rounded bg-black/60 text-white">
                  You ({user?.name || user?.email || "Me"})
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={async () => {
                  const next = !camOn;
                  if (!pc) return;
                  if (!next) {
                    const vTrack = localStream?.getVideoTracks()?.[0];
                    if (vTrack) vTrack.stop();
                    if (videoSenderRef.current) {
                      try {
                        await videoSenderRef.current.replaceTrack(null);
                      } catch (_) {}
                    }
                    const remaining = new MediaStream(
                      (localStream?.getTracks() || []).filter((t) => t.kind === "audio")
                    );
                    setLocalStream(remaining);
                    setCamOn(false);
                  } else {
                    try {
                      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
                      const newTrack = camStream.getVideoTracks()[0];
                      if (videoSenderRef.current) {
                        await videoSenderRef.current.replaceTrack(newTrack);
                      } else if (pc) {
                        const sender = pc.addTrack(newTrack, camStream);
                        videoSenderRef.current = sender;
                      }
                      const merged = new MediaStream([
                        ...(localStream?.getAudioTracks() || []),
                        newTrack,
                      ]);
                      setLocalStream(merged);
                      setCamOn(true);
                    } catch (err) {
                      console.error(err);
                      toast("Could not access camera", "error");
                    }
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold ${
                  camOn ? "bg-white/10 border border-white/20 text-white" : "bg-amber-600 text-white"
                }`}
              >
                {camOn ? "Camera Off" : "Camera On"}
              </button>
              <button
                onClick={async () => {
                  const next = !micOn;
                  if (!pc) return;
                  if (!next) {
                    const aTrack = localStream?.getAudioTracks()?.[0];
                    if (aTrack) aTrack.stop();
                    if (audioSenderRef.current) {
                      try {
                        await audioSenderRef.current.replaceTrack(null);
                      } catch (_) {}
                    }
                    const remaining = new MediaStream(
                      (localStream?.getTracks() || []).filter((t) => t.kind === "video")
                    );
                    setLocalStream(remaining);
                    setMicOn(false);
                  } else {
                    try {
                      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                      const newTrack = audioStream.getAudioTracks()[0];
                      if (audioSenderRef.current) {
                        await audioSenderRef.current.replaceTrack(newTrack);
                      } else if (pc) {
                        const sender = pc.addTrack(newTrack, audioStream);
                        audioSenderRef.current = sender;
                      }
                      const merged = new MediaStream([
                        ...(localStream?.getVideoTracks() || []),
                        newTrack,
                      ]);
                      setLocalStream(merged);
                      setMicOn(true);
                    } catch (err) {
                      console.error(err);
                      toast("Could not access microphone", "error");
                    }
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold ${
                  micOn ? "bg-white/10 border border-white/20 text-white" : "bg-amber-600 text-white"
                }`}
              >
                {micOn ? "Mute" : "Unmute"}
              </button>
              <button
                onClick={closeCall}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold hover:bg-rose-700"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MySessions;
