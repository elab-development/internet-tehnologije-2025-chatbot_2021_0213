import { useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../lib/api";
import Button from "../components/Button";
import Input from "../components/Input";
import Card from "../components/Card";
import Alert from "../components/Alert";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!username || !password) { setError("Unesite korisničko ime i lozinku."); return; }
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem("token", data.token);

      if (data.user.role === "admin") window.location.href = "/admin";
else if (data.user.role === "editor") window.location.href = "/editor";
else window.location.href = "/";

    } catch (e) {
      setError(e.message === "Bad credentials" ? "Pogrešno korisničko ime ili lozinka." : e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <Card>
        <h1 className="auth-title">Prijava</h1>
        <p className="auth-sub">Prijavite se na vaš nalog</p>
        <Alert type="error" onClose={() => setError("")}>{error}</Alert>
        <div className="form-group">
          <div className="label">Korisničko ime</div>
          <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Unesite korisničko ime" onKeyDown={e => { if (e.key === "Enter") login(); }} />
        </div>
        <div className="form-group">
          <div className="label">Lozinka</div>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Unesite lozinku" onKeyDown={e => { if (e.key === "Enter") login(); }} />
        </div>
        <div className="form-footer">
          <a href="/register" className="link">Nemate nalog? Registrujte se</a>
          <Button onClick={login} disabled={loading}>{loading ? "…" : "Prijava"}</Button>
        </div>
      </Card>
    </div>
  );
}