import { useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../../lib/api";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Card from "../../components/Card";
import Alert from "../../components/Alert";

export default function AdminLogin() {
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
      if (data.user.role === "admin") router.push("/admin");
      else if (data.user.role === "editor") router.push("/editor");
      else router.push("/user/profile");
    } catch (e) {
      setError(e.message === "Bad credentials" ? "Pogrešno korisničko ime ili lozinka." : e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <Card>
        <h1 className="auth-title">Admin prijava</h1>
        <p className="auth-sub">Samo za administratore i editore</p>

        <Alert type="error" onClose={() => setError("")}>{error}</Alert>

        <div className="form-group">
          <div className="label">Korisničko ime</div>
          <Input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="admin / editor"
            onKeyDown={e => { if (e.key === "Enter") login(); }}
          />
        </div>
        <div className="form-group">
          <div className="label">Lozinka</div>
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Lozinka"
            onKeyDown={e => { if (e.key === "Enter") login(); }}
          />
        </div>
        <div className="form-footer">
          <a href="/user/login" className="link">← Korisnička prijava</a>
          <Button onClick={login} disabled={loading}>
            {loading ? "…" : "Prijava"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
