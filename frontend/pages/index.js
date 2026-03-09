import { useEffect, useRef, useState } from "react";
import { apiFetch, getToken } from "../lib/api";
import Button from "../components/Button";
import Input from "../components/Input";
import Card from "../components/Card";
import Alert from "../components/Alert";

export default function Home() {
  const [messages, setMessages] = useState([
    { who: "bot", text: "Zdravo! 👋 Postavi pitanje vezano za studentsku službu FON-a (npr. 'Gde se nalazi studentska služba?', 'Koje je radno vreme?')." }
  ]);
  const [suggestions, setSuggestions] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [messages, suggestions]);


  async function send(text) {
    const msg = text.trim();
    if (!msg) return;
    setSuggestions([]);
    setError("");
    setMessages(m => [...m, { who: "user", text: msg }]);
    setInput("");
    setBusy(true);
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const data = await apiFetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ message: msg })
      });
      setMessages(m => [...m, { who: "bot", text: data.answer }]);
      setSuggestions(data.suggestions || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 26 }}>Chatbot studentske službe</h1>
          <p className="small" style={{ margin: "4px 0 0" }}>Postavi pitanje i dobij odgovor u sekundi.</p>
        </div>
      </div>

      <Card>
        <div ref={boxRef} className="chatBox">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.who}`}>
              <div className="who">{m.who === "user" ? "Ti" : "🤖 Bot"}</div>
              <div className="bubble">{m.text}</div>
            </div>
          ))}
          {busy && (
            <div className="msg bot">
              <div className="who">🤖 Bot</div>
              <div className="bubble small">Kucam odgovor…</div>
            </div>
          )}
        </div>
      </Card>

      <Alert type="error" onClose={() => setError("")}>{error}</Alert>

      {suggestions?.length > 0 && (
        <div>
          <div className="small" style={{ marginTop: 10 }}>Možda te zanima:</div>
          <div className="suggestions">
            {suggestions.map(s => (
              <button key={s.id} className="sug" onClick={() => send(s.question)}>
                {s.question}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="row" style={{ marginTop: 14 }}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Unesi pitanje…"
          onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
          disabled={busy}
        />
        <Button onClick={() => send(input)} disabled={busy}>
          {busy ? "…" : "Pošalji"}
        </Button>
      </div>

      <div className="small" style={{ marginTop: 8 }}>
        Odgovori su iz baze znanja. Bot prepoznaje ključne reči i sličnost pitanja.
      </div>
    </div>
  );
}
