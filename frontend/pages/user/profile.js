import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch, getToken } from "../../lib/api";
import Card from "../../components/Card";
import Button from "../../components/Button";
import Alert from "../../components/Alert";

export default function UserProfile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/user/login"); return; }

    Promise.all([
      apiFetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } }),
      apiFetch("/api/chat/history", { headers: { Authorization: `Bearer ${token}` } })
        .catch(() => [])
    ]).then(([me, hist]) => {
      if (me.role !== "user") { router.push("/"); return; }
      setUser(me);
      setHistory(hist || []);
    }).catch(e => {
      setError(e.message);
      router.push("/user/login");
    }).finally(() => setLoading(false));
  }, []);

  function logout() {
    localStorage.removeItem("token");
    router.push("/");
  }

  if (loading) return <div className="container"><p>Učitavanje…</p></div>;

  return (
    <div className="container">
      <div className="page-header">
        <h1>Moj profil</h1>
        <Button variant="secondary" onClick={logout}>Odjava</Button>
      </div>

      <Alert type="error" onClose={() => setError("")}>{error}</Alert>

      {user && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
              👤
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{user.username}</div>
              <span className="badge">{user.role}</span>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h2 style={{ marginTop: 0 }}>Istorija razgovora ({history.length})</h2>
        {history.length === 0 ? (
          <p className="small">Još uvek nema razgovora. <a href="/" className="link">Postavi pitanje!</a></p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Vaše pitanje</th>
                <th>Odgovor bota</th>
                <th>Vreme</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 20).map(h => (
                <tr key={h.id}>
                  <td><strong>{h.message}</strong></td>
                  <td className="small">{h.response.length > 100 ? h.response.slice(0, 100) + "…" : h.response}</td>
                  <td className="small">{new Date(h.created_at).toLocaleString("sr-RS")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
