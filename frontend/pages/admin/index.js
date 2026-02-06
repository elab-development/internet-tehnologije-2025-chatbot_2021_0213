import { useEffect, useState } from "react";
import { apiFetch, getToken } from "../../lib/api";
import { useRouter } from "next/router";

export default function Admin() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ id: null, question: "", answer: "", keywords: "" });
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const token = getToken();
      if (!token) return router.push("/admin/login");
      const data = await apiFetch("/api/qa", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRows(data);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setError("");
    try {
      const token = getToken();
      if (!token) return router.push("/admin/login");

      const payload = { question: form.question, answer: form.answer, keywords: form.keywords };
      if (form.id) {
        await apiFetch(`/api/qa/${form.id}`, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});


      } else {
        await apiFetch("/api/qa", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});

      }
      setForm({ id: null, question: "", answer: "", keywords: "" });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function del(id) {
    if (!confirm("Obrisati?")) return;
    setError("");
    try {
      const token = getToken();
      await apiFetch(`/api/qa/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function edit(r) {
    setForm({ id: r.id, question: r.question, answer: r.answer, keywords: r.keywords || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Admin: Knowledge Base</h1>
        <div className="row">
          <a className="badge" href="/">Chat</a>
          <a className="badge" href="/admin/login">Login</a>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>{form.id ? `Edit #${form.id}` : "Add new Q/A"}</h2>
        <div className="row">
          <div style={{ flex: 1 }}>
            <div className="small">Pitanje</div>
            <input className="input" value={form.question} onChange={e=>setForm(f=>({ ...f, question: e.target.value }))} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="small">Odgovor</div>
          <textarea value={form.answer} onChange={e=>setForm(f=>({ ...f, answer: e.target.value }))} />
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="small">Ključne reči (zarezom odvojene)</div>
          <input className="input" value={form.keywords} onChange={e=>setForm(f=>({ ...f, keywords: e.target.value }))} placeholder="npr. login, prijava, admin" />
        </div>
        {error && <div style={{ marginTop: 12, color: "crimson" }}>{error}</div>}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={save}>{form.id ? "Sačuvaj" : "Dodaj"}</button>
          <button className="btn secondary" onClick={() => setForm({ id: null, question: "", answer: "", keywords: "" })}>
            Reset
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Lista (ukupno: {rows.length})</h2>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Pitanje</th>
              <th>Ključne reči</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>
                  <div><strong>{r.question}</strong></div>
                  <div className="small">{r.answer}</div>
                </td>
                <td className="small">{r.keywords}</td>
                <td>
                  <div className="row">
                    <button className="btn secondary" onClick={() => edit(r)}>Edit</button>
                    <button className="btn" onClick={() => del(r.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan="4" className="small">Nema unosa.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}