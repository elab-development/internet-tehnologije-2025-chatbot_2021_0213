import { useState } from "react";
import { useRouter } from "next/router";
import { apiFetch } from "../lib/api";
import Button from "../components/Button";
import Input from "../components/Input";
import Card from "../components/Card";
import Alert from "../components/Alert";

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function register() {
    if (!username || !password) { setError("Popunite sva polja."); return; }
    if (username.length < 3) { setError("Korisničko ime mora imati najmanje 3 karaktera."); return; }
    if (password.length < 6) { setError("Lozinka mora imati najmanje 6 karaktera."); return; }
    if (password !== confirm) { setError("Lozinke se ne poklapaju."); return; }
    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      setSuccess("Nalog je uspešno kreiran! Preusmeravamo vas na prijavu…");
      setTimeout(() => router.push("/login"), 2000);
    } catch (e) {
      setError(e.message === "User already exists" ? "Korisničko ime je zauzeto." : e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <Card>
        <h1 className="auth-title">Registracija</h1>
        <p className="auth-sub">Kreirajte nalog za pristup chatbotu</p>
        <Alert type="error" onClose={() => setError("")}>{error}</Alert>
        <Alert type="success">{success}</Alert>
        <div className="form-group">
          <div className="label">Korisničko ime</div>
          <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Min. 3 karaktera" />
        </div>
        <div className="form-group">
          <div className="label">Lozinka</div>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 karaktera" />
        </div>
        <div className="form-group">
          <div className="label">Potvrda lozinke</div>
          <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Ponovite lozinku" onKeyDown={e => { if (e.key === "Enter") register(); }} />
        </div>
        <div className="form-footer">
          <a href="/login" className="link">Već imate nalog? Prijavite se</a>
          <Button onClick={register} disabled={loading}>{loading ? "…" : "Registruj se"}</Button>
        </div>
      </Card>
    </div>
  );
}