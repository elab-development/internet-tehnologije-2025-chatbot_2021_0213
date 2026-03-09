import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getToken, apiFetch } from "../lib/api";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiFetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
    router.push("/");
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <a href="/" className="navbar-brand">🎓 FON Chatbot</a>
        <div className="navbar-links">
          <a href="/" className={router.pathname === "/" ? "nav-link active" : "nav-link"}>Chat</a>
          {!user && (
            <>
            <a href="/login" className={router.pathname === "/login" ? "nav-link active" : "nav-link"}>Prijava</a>
<a href="/register" className={router.pathname === "/register" ? "nav-link active" : "nav-link"}>Registracija</a>
            </>
          )}
          {user?.role === "user" && (
            <a href="/user/profile" className={router.pathname === "/user/profile" ? "nav-link active" : "nav-link"}>Profil</a>
          )}
          {user?.role === "editor" && (
            <a href="/editor" className={router.pathname.startsWith("/editor") ? "nav-link active" : "nav-link"}>Editor panel</a>
          )}
          {user?.role === "admin" && (
            <a href="/admin" className={router.pathname.startsWith("/admin") ? "nav-link active" : "nav-link"}>Admin panel</a>
          )}
          {user && (
            <div className="nav-user">
              <span className="nav-badge">{user.role}</span>
              <span className="nav-username">{user.username}</span>
              <button className="btn secondary small" onClick={logout}>Odjava</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
