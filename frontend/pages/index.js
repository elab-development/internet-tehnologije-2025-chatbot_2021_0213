import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import Button from "../components/Button";
import Input from "../components/Input";
import Card from "../components/Card";





export default function Home() {
  const [messages, setMessages] = useState([
    { who: "bot", text: "Ćao! Postavi pitanje vezano za studentsku službu (npr. 'Gde se nalazi studentska služba?', 'Koje je radno vreme?')." }
  ]);
  const [suggestions, setSuggestions] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [messages, suggestions]);

  async function send(text) {
    const msg = text.trim();
    if (!msg) return;
    setSuggestions([]);
    setMessages(m => [...m, { who: "user", text: msg }]);
    setInput("");
    setBusy(true);
    try {
      const data = await apiFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: msg })
      });
      setMessages(m => [...m, { who: "bot", text: data.answer }]);
      setSuggestions(data.suggestions || []);
    } catch (e) {
      setMessages(m => [...m, { who: "bot", text: `Greška: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Chatbot</h1>
        <a className="badge" href="/admin/login">Admin</a>
      </div>

      <Card style={{ marginTop: 16 }}>
        <div ref={boxRef} className="chatBox">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.who}`}>
              <div className="who">
                {m.who === "user" ? "Ti" : "Bot"}
              </div>
              <div className="bubble">{m.text}</div>
            </div>
          ))}
        </div>
      </Card>

      {suggestions?.length > 0 && (
        <div className="suggestions">
          {suggestions.map(s => (
            <button
              key={s.id}
              className="sug"
              onClick={() => send(s.question)}
            >
              {s.question}
            </button>
          ))}
        </div>
      )}

      <div className="row" style={{ marginTop: 12 }}>
<Input
  value={input}
  onChange={(e) => setInput(e.target.value)}
  placeholder="Unesi pitanje…"
  onKeyDown={(e) => {
    if (e.key === "Enter") send(input);
  }}
  disabled={busy}
/>


        <Button onClick={() => send(input)} disabled={busy}>
         {busy ? "…" : "Pošalji"}
        </Button>

      </div>

      <div className="small" style={{ marginTop: 8 }}>
        Odgovori su iz baze znanja (predefinisani). Bot prepoznaje ključne reči i sličnost pitanja.
      </div>
    </div>
  );
}
