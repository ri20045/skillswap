import React, { useState } from "react";
import Dashboard from "./Dashboard";
import Profile from "./Profile";
import BrowseSkills from "./BrowseSkills";
import MySessions from "./MySessions";

const Home = ({ user, setUser }) => {
  const [activeSection, setActiveSection] = useState("dashboard");

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "🏠" },
    { id: "browse", label: "Browse", icon: "🔍" },
    { id: "sessions", label: "Sessions", icon: "📅" },
    {
      id: "profile",
      label: "Profile",
      icon: user?.name?.[0]?.toUpperCase() || "👤",
    },
  ];

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard user={user} onNavigate={setActiveSection} />;
      case "browse":
        return <BrowseSkills user={user} />;
      case "sessions":
        return <MySessions user={user} />;
      case "profile":
        return <Profile user={user} setUser={setUser} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">

      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(#2563eb 0.5px, transparent 0.5px)",
          backgroundSize: "30px 30px",
        }}
      />
      <div className="absolute w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[160px] -top-60 -left-60" />

      {/* TOP NAV */}
      <nav className="relative z-50 bg-black/60 backdrop-blur border-b border-blue-500/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">

            {/* Logo */}
            <button
              onClick={() => setActiveSection("dashboard")}
              className="flex items-center gap-3 group focus:outline-none"
            >
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700 blur-[6px] opacity-80" />
                <div className="relative w-full h-full rounded-2xl bg-black border border-blue-500/50 flex items-center justify-center">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-200">
                    <polyline points="16 3 21 3 21 8"></polyline>
                    <line x1="21" y1="3" x2="13" y2="11"></line>
                    <polyline points="8 21 3 21 3 16"></polyline>
                    <line x1="3" y1="21" x2="11" y2="13"></line>
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-lg font-black tracking-[0.3em]">SKILL SWAP</h1>
                <p className="text-[10px] uppercase text-blue-300/70 tracking-[0.25em]">Connect • Learn • Teach</p>
              </div>
            </button>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wide transition-all
                    ${
                      activeSection === item.id
                        ? "bg-cyan-400/20 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                        : "text-blue-300/70 hover:text-white hover:bg-blue-600/20"
                    }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="text-xs font-black tracking-widest px-4 py-2 rounded-lg border border-blue-500/30 hover:border-red-500 hover:text-red-400 transition-all"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/70 backdrop-blur border-t border-blue-500/20">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center text-xs transition-all
                ${
                  activeSection === item.id
                    ? "text-cyan-400 scale-110"
                    : "text-blue-400/60"
                }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-14 pb-28 md:pb-14">

        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black tracking-widest mb-4">
            HELLO, {user?.name?.toUpperCase() || "BUDDY"}
          </h2>
          <p className="text-blue-400/70 max-w-2xl mx-auto">
            Connect • Learn • Exchange Skills
          </p>
        </div>

        {/* Section */}
        {renderSection()}
      </main>

      {/* Corner accents */}
      <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-blue-500/20" />
      <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-blue-500/20" />
    </div>
  );
};

export default Home;
