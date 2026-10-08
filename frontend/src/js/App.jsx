import React, { useState } from "react";
import SplashScreen from "./SplashScreen";
import Login from "./Login";
import Register from "./Register";
import Home from "./home"; 
import AdminDashboard from "./ADashboard"; // 👈 Import the new component
import ResetPassword from "./ResetPassword";
import Landing from "./Landing";
import AnnouncementBar from "./AnnouncementBar";


function App() {
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get("token");
  const resetEmail = params.get("email");
  const skipSplash = params.get("skipSplash") === "1";

  const [showSplash, setShowSplash] = useState(!skipSplash);
  const [showLanding, setShowLanding] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [user, setUser] = useState(null);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (resetToken && resetEmail) {
    return <ResetPassword token={resetToken} email={resetEmail} />;
  }

  // Landing flow
  if (!user && showLanding) {
    return (
      <Landing
        onGetStarted={() => {
          setShowLanding(false);
          setShowRegister(true);
        }}
        onSignIn={() => setShowLanding(false)}
        onSignUp={() => {
          setShowLanding(false);
          setShowRegister(true);
        }}
      />
    );
  }

  // LOGIC FOR LOGGED IN USERS
  if (user) {
    // Check if the user is the specific admin
    if (user.email === "admin1@gmail.com") {
      return (
        <>
          <AnnouncementBar />
          <AdminDashboard user={user} setUser={setUser} />
        </>
      );
    }
    // Otherwise, show regular Home/Dashboard
    return (
      <>
        <AnnouncementBar />
        <Home user={user} setUser={setUser} />
      </>
    );
  }

  // LOGIC FOR LOGGED OUT USERS
  return showRegister ? (
    <Register onLoginClick={() => setShowRegister(false)} />
  ) : (
    <Login
      onRegisterClick={() => setShowRegister(true)}
      onLoginSuccess={(userData) => setUser(userData)}
    />
  );
}

export default App;
