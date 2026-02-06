import { useState } from "react";
import { apiFetch, getToken } from "../../lib/api";
import { useRouter } from "next/router";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  async function login() {
    setError("");
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem("token", data.token);
      router.push("/admin");
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Admin login</h1>
        <a className="badge" href="/">Chat</a>
      </div>

      <div className="card" style={{ marginTop: 16, maxWidth: 520 }}>
        <div className="small">Token se čuva u localStorage.</div>
        <div style={{ marginTop: 12 }}>
          <div className="small">Username</div>
          <input className="input" value={username} onChange={e=>setUsername(e.target.value)} />
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="small">Password</div>
          <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        {error && <div style={{ marginTop: 12, color: "crimson" }}>{error}</div>}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={login}>Login</button>
          <button className="btn secondary" onClick={() => { localStorage.removeItem("token"); setError("Token obrisan."); }}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}