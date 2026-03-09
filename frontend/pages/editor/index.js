import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch, getToken } from "../../lib/api";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Card from "../../components/Card";
import Alert from "../../components/Alert";

export default function EditorPanel() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ id: null, question: "", answer: "", keywords: "", category_id: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    apiFetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(me => {
        if (me.role !== "editor" && me.role !== "admin") { router.push("/"); return; }
        loadData();
      })
      .catch(() => router.push("/user/login"));
  }, []);

  async function loadData() {
    const token = getToken();
    try {
      const [qaData, catData] = await Promise.all([
        apiFetch("/api/qa", { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch("/api/categories")
      ]);
      setRows(qaData);
      setCategories(catData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!form.question || !form.answer) { setError("Pitanje i odgovor su obavezni."); return; }
    setError(""); setSuccess("");
    const token = getToken();
    const payload = {
      question: form.question,
      answer: form.answer,
      keywords: form.keywords,
      category_id: form.category_id ? Number(form.category_id) : null
    };
    try {
      if (form.id) {
        await apiFetch(`/api/qa/${form.id}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        setSuccess("Pitanje uspešno izmenjeno.");
      } else {
        await apiFetch("/api/qa", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        setSuccess("Pitanje uspešno dodato.");
      }
      setForm({ id: null, question: "", answer: "", keywords: "", category_id: "" });
      await loadData();
    } catch (e) {
      setError(e.message);
    }
  }

  function edit(r) {
    setForm({ id: r.id, question: r.question, answer: r.answer, keywords: r.keywords || "", category_id: r.category_id || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const filtered = rows.filter(r =>
    !search || r.question.toLowerCase().includes(search.toLowerCase()) || (r.keywords || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="container"><p>Učitavanje…</p></div>;

  return (
    <div className="container">
      <div className="page-header">
        <h1>Editor panel</h1>
        <span className="badge">Možete dodavati i menjati pitanja</span>
      </div>

      <Alert type="error" onClose={() => setError("")}>{error}</Alert>
      <Alert type="success" onClose={() => setSuccess("")}>{success}</Alert>

      <Card style={{ marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>{form.id ? `Izmena pitanja #${form.id}` : "Dodaj novo pitanje"}</h2>
        <div className="form-group">
          <div className="label">Pitanje *</div>
          <Input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="Unesite pitanje" />
        </div>
        <div className="form-group">
          <div className="label">Odgovor *</div>
          <textarea className="input" value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="Unesite odgovor" />
        </div>
        <div className="row">
          <div style={{ flex: 1 }}>
            <div className="label">Ključne reči</div>
            <Input value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder="npr. radno vreme, ispiti" />
          </div>
          <div style={{ flex: 1 }}>
            <div className="label">Kategorija</div>
            <select className="input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
              <option value="">-- Izaberi --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <Button onClick={save}>{form.id ? "Sačuvaj izmene" : "Dodaj pitanje"}</Button>
          <Button variant="secondary" onClick={() => setForm({ id: null, question: "", answer: "", keywords: "", category_id: "" })}>Otkaži</Button>
        </div>
      </Card>

      <Card>
        <div className="row" style={{ marginBottom: 14, justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Baza pitanja ({filtered.length})</h2>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pretraži…" style={{ maxWidth: 240 }} />
        </div>
        <table className="table">
          <thead>
            <tr><th>#</th><th>Pitanje / Odgovor</th><th>Kategorija</th><th>Ključne reči</th><th>Akcije</th></tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td className="small">{r.id}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>{r.question}</div>
                  <div className="small">{r.answer.length > 80 ? r.answer.slice(0, 80) + "…" : r.answer}</div>
                </td>
                <td><span className="badge">{r.category_name || "—"}</span></td>
                <td className="small">{r.keywords || "—"}</td>
                <td>
                  <Button variant="secondary" onClick={() => edit(r)}>Izmeni</Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="5" className="small">Nema rezultata.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
