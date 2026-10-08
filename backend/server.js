const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch (err) {
  console.warn("nodemailer not installed; Brevo SMTP disabled until installed.");
}
require("dotenv").config();

const app = express();
const PORT = 4000;
const http = require("http");

// Middleware
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------
// 🔌 MongoDB Connection
// ---------------------------------------------------------
mongoose
  .connect("mongodb://127.0.0.1:27017/skillswap")
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.error("MongoDB Error:", err));

// ---------------------------------------------------------
// 📂 File Uploads (attachments)
// ---------------------------------------------------------
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}
app.use("/uploads", express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

// 🗑️ Admin delete feedback/rating
app.delete("/api/admin/ratings/:sessionId/:ratingId", async (req, res) => {
  try {
    const { sessionId, ratingId } = req.params;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const before = session.ratings.length;
    session.ratings = session.ratings.filter((r) => String(r._id) !== String(ratingId));
    if (session.ratings.length === before) {
      return res.status(404).json({ message: "Rating not found" });
    }
    await session.save();
    res.json({ message: "Rating deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const allowedExt = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".md", ".csv", ".json", ".zip", ".doc", ".docx", ".ppt", ".pptx"];
const allowedMime = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
];


const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExt.includes(ext) || !allowedMime.includes(file.mimetype)) {
      return cb(new Error("File type not allowed"));
    }
    cb(null, true);
  },
});

// ---------------------------------------------------------
// ✉️ SendGrid Setup
// ---------------------------------------------------------
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const FROM_EMAIL = process.env.FROM_EMAIL || "no-reply@skillswap.test";

// Unified mail sender: can log-only (default) or send via Brevo SMTP or SendGrid
const sendMail = async ({ to, subject, text, html }) => {
  // If EMAIL_ENABLED is not true, just log and return
  if (process.env.EMAIL_ENABLED !== "true") {
    console.warn("Email sending disabled (EMAIL_ENABLED!=true); logging instead.");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("Text:", text);
    return;
  }

  // Brevo SMTP (recommended free tier)
  if (nodemailer && process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.BREVO_SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });
    await transporter.sendMail({ from: FROM_EMAIL, to, subject, text, html });
    return;
  }

  // SendGrid API fallback
  if (process.env.SENDGRID_API_KEY) {
    await sgMail.send({ to, from: FROM_EMAIL, subject, text, html });
    return;
  }

  // Dev fallback: log
  console.warn("No mail provider configured; logging reset link instead.");
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log("Text:", text);
};
// ---------------------------------------------------------
// 📑 Database Schemas & Models
// ---------------------------------------------------------

// 👤 User Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  skillsIHave: [String],
  skillsIWant: [String],
  resetToken: String,
  resetExpires: Date,
  blocked:{ type:Boolean, default:false }  


});

const User = mongoose.model("User", userSchema);

// 🤝 Updated Session/Request Model for Continuous Chat
const sessionSchema = new mongoose.Schema({
  senderEmail: String,
  senderName: String,
  receiverEmail: String,
  skill: String,
   meetLink: {
    type: String,
    default: ""
  },
  hasNewForReceiver: { type: Boolean, default: false },
  // Array of objects to store the whole conversation history
  messages: [{
    text: String,
    attachment: {
      name: String,
      url: String,
      mime: String,
      size: Number,
    },
    sender: String, // email of the person who sent this message
    timestamp: { type: Date, default: Date.now }
  }],
  status: { type: String, default: "pending" },
  timestamp: { type: Date, default: Date.now },
  ratings: [{
    fromEmail: String,
    toEmail: String,
    score: Number,
    feedback: String,
    badge: String,
    createdAt: { type: Date, default: Date.now }
  }]
});
const Session = mongoose.model("Session", sessionSchema);

// 🔔 Announcement schema
const announcementSchema = new mongoose.Schema({
  message: { type: String, required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});
const Announcement = mongoose.model("Announcement", announcementSchema);
// Prefer bcryptjs (pure JS); gracefully fall back if unavailable
let bcrypt;
try {
  bcrypt = require("bcryptjs");
} catch (err) {
  try {
    bcrypt = require("bcrypt");
  } catch (_) {
    bcrypt = null;
  }
}
const SALT_ROUNDS = 10; // Standard security level
const cryptoHash = (str) =>
  crypto.createHash("sha256").update(str).digest("hex");
const isBcryptHash = (str) => typeof str === "string" && str.startsWith("$2");
const hashPassword = async (plain) => {
  if (bcrypt?.hash) return bcrypt.hash(plain, SALT_ROUNDS);
  return cryptoHash(plain);
};
const passwordsMatch = async (plain, hashed) => {
  if (!hashed) return false;
  if (plain === hashed) return true; // covers legacy plaintext (from old reset bug)
  if (isBcryptHash(hashed) && bcrypt?.compare) return bcrypt.compare(plain, hashed);
  return cryptoHash(plain) === hashed;
};
// ---------------------------------------------------------
// 🔐 AUTH ROUTES
// ---------------------------------------------------------
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    // HASH THE PASSWORD HERE
    const hashedPassword = await hashPassword(password);

    const newUser = new User({
      name,
      email,
      password: hashedPassword, // Save the hash, not the plain text
      skillsIHave: [],
      skillsIWant: []
    });
    await newUser.save();
    res.json({ message: "Registered ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
   
    // 1. Find user by email ONLY
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // 2. Use bcrypt to compare the plain text input with the stored hash
    const isMatch = await passwordsMatch(password, user.password);
   
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Forgot password - send reset email
app.post("/api/password/forgot", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) {
      // do not reveal user absence
      return res.json({ message: "If the email exists, a reset link has been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const resetLink = `${FRONTEND_URL}?token=${token}&email=${encodeURIComponent(email)}`;
    if (process.env.EMAIL_ENABLED !== "true") {
      console.log("[Password reset link]", resetLink);
    }
    await sendMail({
      to: email,
      subject: "SkillSwap Password Reset",
      text: `Reset your password: ${resetLink}`,
      html: `<p>You requested a password reset.</p><p><a href="${resetLink}">Click here to reset your password</a></p><p>This link expires in 15 minutes.</p>`,
    });

    res.json({ message: "If the email exists, a reset link has been sent." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Reset password
app.post("/api/password/reset", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword)
      return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({
      email,
      resetToken: token,
      resetExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired link" });

    user.password = await hashPassword(newPassword);
    user.resetToken = undefined;
    user.resetExpires = undefined;
    await user.save();
    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update basic user info (name/password)
app.patch("/api/users/:email", async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name && !password) {
      return res.status(400).json({ message: "No fields provided" });
    }

    const update = {};
    if (name) update.name = name;
    if (password) update.password = await hashPassword(password);

    const updated = await User.findOneAndUpdate(
      { email: req.params.email },
      { $set: update },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------
// 🧠 SKILLS ROUTES
// ---------------------------------------------------------
app.get("/api/skills/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      skillsIHave: user.skillsIHave || [],
      skillsIWant: user.skillsIWant || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/skills/:email", async (req, res) => {
  try {
    const { skillsIHave, skillsIWant } = req.body;
    const user = await User.findOneAndUpdate(
      { email: req.params.email },
      { $set: { skillsIHave, skillsIWant } },
      { new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------
// 🔍 MATCHING LOGIC
// ---------------------------------------------------------
app.get("/api/match/:email", async (req, res) => {
  try {
    const currentUser = await User.findOne({ email: req.params.email });
    if (!currentUser) return res.json([]);

    const normalize = (s) => (s || "").trim().toLowerCase();

    const currentHaveLower = new Set(
      (currentUser.skillsIHave || []).map(normalize).filter(Boolean)
    );
    const currentWantLower = new Set(
      (currentUser.skillsIWant || []).map(normalize).filter(Boolean)
    );

    const users = await User.find({ email: { $ne: currentUser.email } });

    const results = users.map((u) => {
      const theirHaveLower = (u.skillsIHave || []).map(normalize);
      const theirWantLower = (u.skillsIWant || []).map(normalize);

      const matchedSkills = (u.skillsIHave || []).filter((s, idx) =>
        currentWantLower.has(theirHaveLower[idx])
      );

      return {
        name: u.name,
        email: u.email,
        skillsIHave: u.skillsIHave,
        skillsIWant: u.skillsIWant,
        matchedSkills,
        isPotentialTeacher: matchedSkills.length > 0,
        isPerfectMatch: theirWantLower.some((s) => currentHaveLower.has(s)),
      };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------
// 💬 CONTINUOUS SESSION / CHAT ROUTES
// ---------------------------------------------------------

// Get all sessions for a user (Incoming & Outgoing)
app.get("/api/sessions/:email", async (req, res) => {
  try {
    const sessions = await Session.find({
      $or: [{ senderEmail: req.params.email }, { receiverEmail: req.params.email }]
    }).sort({ timestamp: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new request (Starts the thread with the first message)
app.post("/api/sessions", async (req, res) => {
  try {
    const { senderEmail, senderName, receiverEmail, skill, message } = req.body;

    // Check for an existing conversation between these two users (either direction)
    const existing = await Session.findOne({
      $or: [
        { senderEmail, receiverEmail },
        { senderEmail: receiverEmail, receiverEmail: senderEmail },
      ],
    });

    const now = new Date();
    const hasMessage = message && String(message).trim().length > 0;

  if (existing) {
      const currentStatus = existing.status || "pending";
      const update = { $set: { timestamp: now } };

      // Always reflect the current requester/receiver roles
      update.$set.senderEmail = senderEmail;
      update.$set.senderName = senderName;
      update.$set.receiverEmail = receiverEmail;

      // Always update skill to the latest requested one
      if (skill) update.$set.skill = skill;

      // If conversation is already accepted/active, keep it accepted and just append message
      if (["accepted", "active"].includes(currentStatus)) {
        update.$set.status = currentStatus;
      } else if (["completed", "rejected", "cancelled"].includes(currentStatus)) {
        // Re-open a finished or cancelled conversation requires re-acceptance
        update.$set.status = "pending";
      } else {
        // already pending; leave as pending
        update.$set.status = currentStatus;
      }

      if (hasMessage) {
        update.$push = {
          messages: { text: message, sender: senderEmail, timestamp: now },
        };
      }

      // If the requester is asking again (especially with a new skill), flag for receiver
      // Any repeat request flags the receiver
      update.$set.hasNewForReceiver = true;
      if (skill) update.$set.skill = skill;

      const updated = await Session.findByIdAndUpdate(existing._id, update, {
        new: true,
      });
      return res.json({ message: "Request Sent! 🚀", session: updated, reused: true });
    }

    const newSession = new Session({
      senderEmail,
      senderName,
      receiverEmail,
      skill,
      status: "pending",
      timestamp: now,
      hasNewForReceiver: true,
      messages: hasMessage ? [{ text: message, sender: senderEmail, timestamp: now }] : [],
    });
    await newSession.save();
    res.json({ message: "Request Sent! 🚀", session: newSession, reused: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update session with new messages (Continuous Talk)
app.patch("/api/sessions/:id", async (req, res) => {
  try {
    const { text, senderEmail, status, rating, resolvePending, attachment } = req.body;
    const now = new Date();

    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const actorEmail = senderEmail || rating?.fromEmail;
    if (!actorEmail) {
      return res.status(400).json({ message: "Sender email required" });
    }

    const isReceiver = actorEmail === session.receiverEmail;
    const isParticipant =
      actorEmail === session.receiverEmail || actorEmail === session.senderEmail;
    const update = {};

    // Add messages
    if ((text || attachment) && senderEmail) {
      update.$push = { messages: { text, attachment, sender: senderEmail, timestamp: now } };
      // auto-accept only when the receiver replies; requester cannot self-accept
      if (isReceiver && !status) {
        update.$set = { status: "accepted" };
      }
      // engaging clears the new-flag for receiver
      if (isReceiver) {
        update.$set = { ...(update.$set || {}), hasNewForReceiver: false };
      }
    }

    // Status-only updates (accept / reject / cancel / complete)
    if (status) {
      if (status === "completed") {
        if (!isParticipant) {
          return res.status(403).json({ message: "Only participants can complete a session" });
        }
        update.$set = { ...(update.$set || {}), status };
      } else if (status === "cancelled") {
        if (!isParticipant) {
          return res.status(403).json({ message: "Only participants can cancel a session" });
        }
        update.$set = { ...(update.$set || {}), status, hasNewForReceiver: false };
      } else {
        if (!isReceiver) {
          return res.status(403).json({ message: "Only the recipient can change status" });
        }
        update.$set = { ...(update.$set || {}), status };
      }
    }

    // Explicit read marker
    if (req.body.markRead && isReceiver) {
      update.$set = { ...(update.$set || {}), hasNewForReceiver: false };
    }

    if (rating) {
      update.$push = {
        ...(update.$push || {}),
        ratings: {
          fromEmail: rating.fromEmail,
          toEmail: rating.toEmail,
          score: rating.score,
          feedback: rating.feedback,
          badge: rating.badge,
        },
      };
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: "No update fields provided" });
    }

    const updated = await Session.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload endpoint
app.post("/api/uploads", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    name: req.file.originalname,
    mime: req.file.mimetype,
    size: req.file.size,
  });
});

// Ratings feed (flattened) for quick consumption
app.get("/api/ratings", async (req, res) => {
  try {
    const sessions = await Session.find({ "ratings.0": { $exists: true } });
    const flattened = sessions.flatMap((s) =>
      (s.ratings || []).map((r) => ({ ...r.toObject ? r.toObject() : r, sessionId: s._id }))
    );
    res.json(flattened);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📢 Announcements (public active)
app.get("/api/announcements/active", async (req, res) => {
  try {
    const now = new Date();
    const active = await Announcement.find({
      active: true,
      startAt: { $lte: now },
      endAt: { $gte: now },
    }).sort({ startAt: 1 });
    res.json(active);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📢 Admin: list all announcements (auto-expire past endAt)
app.get("/api/admin/announcements", async (_req, res) => {
  try {
    const now = new Date();
    const all = await Announcement.find({}).sort({ createdAt: -1 });

    // Auto-toggle expired ones to inactive (best-effort)
    const updates = all
      .filter((a) => a.active && a.endAt && a.endAt < now)
      .map((a) =>
        Announcement.findByIdAndUpdate(a._id, { $set: { active: false } }, { new: true })
      );
    if (updates.length) {
      const updated = await Promise.all(updates);
      // replace updated docs in list
      updated.forEach((u) => {
        const idx = all.findIndex((a) => a._id.toString() === u._id.toString());
        if (idx >= 0) all[idx] = u;
      });
    }

    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📢 Admin: create announcement
app.post("/api/admin/announcements", async (req, res) => {
  try {
    const { message, startAt, endAt, active = true } = req.body;
    if (!message || !startAt || !endAt) {
      return res.status(400).json({ error: "message, startAt, endAt required" });
    }
    const doc = new Announcement({
      message,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      active: Boolean(active),
    });
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📢 Admin: toggle active
app.patch("/api/admin/announcements/:id/toggle", async (req, res) => {
  try {
    const { active } = req.body;
    const doc = await Announcement.findByIdAndUpdate(
      req.params.id,
      { $set: { active: Boolean(active) } },
      { new: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📢 Admin: delete announcement
app.delete("/api/admin/announcements/:id", async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🗑️ DELETE SESSION
// This allows User 1 or User 2 to delete the entire conversation
app.delete("/api/sessions/:id", async (req, res) => {
  try {
    await Session.findByIdAndDelete(req.params.id);
    res.json({ message: "Conversation deleted successfully 🗑️" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const users = await User.find({});

    // Attach badges/ratings from sessions
    const sessions = await Session.find({ "ratings.0": { $exists: true } });

    const userMap = {};

    users.forEach(u => {
      userMap[u.email] = {
        name: u.name,
        email: u.email,
        skillsIHave: u.skillsIHave || [],
        skillsIWant: u.skillsIWant || [],
        badges: [],
        ratings: []
      };
    });

    sessions.forEach(s => {
      (s.ratings || []).forEach(r => {
        if (userMap[r.toEmail]) {
          userMap[r.toEmail].badges.push(r.badge);
          userMap[r.toEmail].ratings.push({
            score: r.score,
            feedback: r.feedback
          });
        }
      });
    });

    res.json(Object.values(userMap));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/stats", async (req,res)=>{
  try {

    const totalUsers = await User.countDocuments();

    const pendingRequests = await Session.countDocuments({ status:"pending" });

    // Get accepted sessions
    const acceptedSessions = await Session.find({ status:"accepted" });

    // Count UNIQUE users in accepted sessions
    const activeSet = new Set();

    acceptedSessions.forEach(s=>{
      activeSet.add(s.senderEmail);
      activeSet.add(s.receiverEmail);
    });

    const activeUsers = activeSet.size;

    const blockedUsers = await User.countDocuments({ blocked:true });

    res.json({
      totalUsers,
      pendingRequests,
      activeUsers,
      blockedUsers
    });

  } catch(err){
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------
// 🚀 SERVER START
// ---------------------------------------------------------
const server = http.createServer(app);

// In-memory signaling store for lightweight WebRTC demo (non-persistent)
const callSignals = {}; // { sessionId: [ { type, payload, ts } ] }

// Get messages since index
app.get("/api/call/:id/messages", (req, res) => {
  const { id } = req.params;
  const since = parseInt(req.query.since || "0", 10);
  const list = callSignals[id] || [];
  res.json({ messages: list.slice(since), nextIndex: list.length });
});

// Post offer/answer/candidate/end
app.post("/api/call/:id/:kind", (req, res) => {
  const { id, kind } = req.params;
  const allowed = ["offer", "answer", "candidate", "end"];
  if (!allowed.includes(kind)) return res.status(400).json({ message: "Invalid kind" });
  const payload = req.body || {};
  if (!callSignals[id]) callSignals[id] = [];

  // Allow only the first offer to win; ignore subsequent offers to avoid race overwriting
  if (kind === "offer" && callSignals[id].some((m) => m.type === "offer")) {
    return res.json({ ok: true, nextIndex: callSignals[id].length });
  }

  callSignals[id].push({ type: kind, payload, ts: Date.now() });
  res.json({ ok: true, nextIndex: callSignals[id].length });
});

server.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);


// ---------------------------------------------------------
// 🚫 DEACTIVATE USER
// ---------------------------------------------------------

app.patch("/api/admin/user/:email/deactivate", async (req, res) => {

  try {

    const user = await User.findOneAndUpdate(

      { email: req.params.email },

      { $set: { blocked: true } },

      { new: true }

    );

    res.json({ message: "User deactivated", user });

  }

  catch (err) {

    res.status(500).json({ error: err.message });

  }

});



// ---------------------------------------------------------
// ✅ ACTIVATE USER
// ---------------------------------------------------------

app.patch("/api/admin/user/:email/activate", async (req, res) => {

  try {

    const user = await User.findOneAndUpdate(

      { email: req.params.email },

      { $set: { blocked: false } },

      { new: true }

    );

    res.json({ message: "User activated", user });

  }

  catch (err) {

    res.status(500).json({ error: err.message });

  }

});



// ---------------------------------------------------------
// 🔐 ADMIN RESET PASSWORD
// ---------------------------------------------------------

app.patch("/api/admin/user/:email/reset-password", async (req, res) => {

  try {

    const { password } = req.body;

    const hashed = await hashPassword(password);

    const user = await User.findOneAndUpdate(

      { email: req.params.email },

      { $set: { password: hashed } },

      { new: true }

    );

    res.json({ message: "Password reset success", user });

  }

  catch (err) {

    res.status(500).json({ error: err.message });

  }

});




// ---------------------------------------------------------
// 📋 GET ALL SESSIONS
// ---------------------------------------------------------

app.get("/api/admin/sessions", async (req, res) => {

  try {

    const sessions = await Session.find().sort({ timestamp: -1 });

    res.json(sessions);

  }

  catch (err) {

    res.status(500).json({ error: err.message });

  }

});




// ---------------------------------------------------------
// ❌ FORCE CANCEL SESSION
// ---------------------------------------------------------

app.patch("/api/admin/session/:id/cancel", async (req, res) => {

  try {

    const session = await Session.findByIdAndUpdate(

      req.params.id,

      { status: "cancelled" },

      { new: true }

    );

    res.json({ message: "Session cancelled", session });

  }

  catch (err) {

    res.status(500).json({ error: err.message });

  }

});




// ---------------------------------------------------------
// 🗑️ DELETE ATTACHMENT
// ---------------------------------------------------------

app.delete("/api/admin/session/:sessionId/attachment", async (req, res) => {

  try {

    const { sessionId } = req.params;

    const { fileUrl } = req.body;



    const session = await Session.findById(sessionId);



    if (!session)

      return res.status(404).json({ message: "Session not found" });



    session.messages.forEach(msg => {

      if (msg.attachment?.url === fileUrl)

        msg.attachment = null;

    });



    await session.save();



    const filePath = path.join(

      __dirname,

      "uploads",

      path.basename(fileUrl)

    );



    if (fs.existsSync(filePath))

      fs.unlinkSync(filePath);



    res.json({ message: "Attachment deleted" });

  }

  catch (err) {

    res.status(500).json({ error: err.message });

  }

});




// ---------------------------------------------------------
// 🏅 GRANT BADGE
// ---------------------------------------------------------

app.post("/api/admin/badge/grant", async (req, res) => {

  try {

    const { sessionId, toEmail, badge } = req.body;



    const session = await Session.findById(sessionId);



    session.ratings.push({

      fromEmail: "admin",

      toEmail,

      score: 5,

      feedback: "Granted by admin",

      badge

    });



    await session.save();



    res.json({ message: "Badge granted" });

  }

  catch (err) {

    res.status(500).json({ error: err.message });

  }

});




// ---------------------------------------------------------
// ❌ REVOKE BADGE
// ---------------------------------------------------------

app.delete("/api/admin/badge/revoke", async (req, res) => {

  try {

    const { sessionId, badge } = req.body;



    const session = await Session.findById(sessionId);



    session.ratings = session.ratings.filter(

      r => r.badge !== badge

    );



    await session.save();



    res.json({ message: "Badge revoked" });

  }

  catch (err) {

    res.status(500).json({ error: err.message });

  }

})
app.post("/api/sessions/:id/meet/create", async (req, res) => {

  try {

    const { meetLink, hostEmail } = req.body;

    const session = await Session.findById(req.params.id);

    if (!session)
      return res.status(404).json({ message: "Session not found" });

    session.meetLink = meetLink;

    session.messages.push({
      text: `📹 Google Meet Link: ${meetLink}`,
      sender: hostEmail,
      timestamp: new Date()
    });

    await session.save();

    res.json({
      message: "Meet link saved",
      meetLink
    });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});
