import React from "react";
import heroImg from "../assets/a.jpeg"; // <-- make sure path is correct

const Landing = ({ onGetStarted, onSignIn, onSignUp }) => {
  return (
    <div className="min-h-screen bg-[#050d1a] text-white font-sans relative overflow-hidden">
      
      {/* gradient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[140px] -top-40 -left-40" />
        <div className="absolute w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-[140px] top-10 right-0" />
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 bg-black/30 backdrop-blur border-b border-blue-500/10">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700 blur-[6px] opacity-80" />
            <div className="relative w-full h-full rounded-2xl bg-black border border-blue-500/50 flex items-center justify-center">
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
          <div>
            <h1 className="text-xl font-black tracking-[0.25em]">SKILLSWAP</h1>
            <p className="text-[10px] uppercase text-blue-300/70 tracking-[0.25em]">
              Connect • Learn • Teach
            </p>
          </div>
        </div>

        {/* <div className="flex items-center gap-3">
          <button
            onClick={onSignIn}
            className="text-sm font-bold text-blue-100 hover:text-white"
          >
            Login
          </button>
          <button
            onClick={onSignUp}
            className="px-4 py-2 rounded-xl text-sm font-black bg-gradient-to-r from-cyan-400 to-indigo-500 text-black hover:shadow-[0_0_20px_rgba(79,70,229,0.45)] transition"
          >
            Sign Up
          </button>
        </div> */}
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-14 space-y-16">
        <section className="grid lg:grid-cols-2 gap-10 items-center">
          
          {/* Left Side */}
          <div className="space-y-6">
            <p className="uppercase text-sm text-blue-300/80 tracking-[0.3em]">
              SkillSwap
            </p>
            <h2 className="text-5xl font-black leading-tight">
              Learn. <span className="text-cyan-300">Teach.</span> Grow.
            </h2>
            <p className="text-blue-200/80 text-lg max-w-xl">
              Connect with people who want to share their skills and learn from others in return.
              No money needed—just a willingness to exchange knowledge.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onGetStarted}
                className="px-6 py-3 rounded-xl font-black text-sm tracking-widest bg-gradient-to-r from-cyan-400 to-indigo-500 text-black hover:shadow-[0_0_25px_rgba(59,130,246,0.35)] transition"
              >
                Get Started
              </button>
              <button
                onClick={onSignIn}
                className="px-6 py-3 rounded-xl font-black text-sm tracking-widest border border-blue-500/50 text-blue-100 hover:border-cyan-400 hover:text-white transition"
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Right Side Image Card */}
          <div className="relative">
            <div className="absolute inset-0 -rotate-3 bg-gradient-to-br from-indigo-700/40 via-cyan-500/30 to-purple-500/30 rounded-3xl blur-xl" />
            <div className="relative bg-[#0b1426] border border-blue-500/20 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden">
                <img
                  src={heroImg}
                  alt="SkillSwap"
                  className="w-full h-full object-cover rounded-2xl hover:scale-105 transition duration-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="space-y-6">
          <h3 className="text-center text-3xl font-black">
            How <span className="text-cyan-300">SkillSwap</span> Works
          </h3>
          <p className="text-center text-blue-200/80 max-w-3xl mx-auto">
            A simple three-step process to start exchanging skills with like-minded people.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Create Your Profile",
                desc: "List what you can teach and what you want to learn so others can find you.",
                icon: "👤",
              },
              {
                title: "Find Matches",
                desc: "We connect you with people whose skills match what you want to learn.",
                icon: "🔍",
              },
              {
                title: "Exchange Skills",
                desc: "Schedule sessions and meet in person.",
                icon: "🤝",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-[#0b1426] border border-blue-500/20 rounded-2xl p-5 shadow-[0_10px_35px_rgba(0,0,0,0.25)]"
              >
                <div className="text-3xl mb-3">{card.icon}</div>
                <h4 className="text-lg font-bold mb-2">{card.title}</h4>
                <p className="text-blue-200/80 text-sm">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
};

export default Landing;