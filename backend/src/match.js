const SERB_DIAC = {
  "č":"c","ć":"c","š":"s","đ":"dj","ž":"z",
  "Č":"c","Ć":"c","Š":"s","Đ":"dj","Ž":"z"
};

export function normalizeText(s) {
  if (!s) return "";
  let out = "";
  for (const ch of s.trim()) out += (SERB_DIAC[ch] ?? ch);
  return out
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(s) {
  const t = normalizeText(s);
  if (!t) return [];
  return t.split(" ").filter(Boolean);
}

function levenshtein(a, b) {
  a = normalizeText(a);
  b = normalizeText(b);
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + cost
      );
      prev = temp;
    }
  }
  return dp[n];
}

function similarity(a, b) {
  const maxLen = Math.max(normalizeText(a).length, normalizeText(b).length);
  if (maxLen === 0) return 0;
  const dist = levenshtein(a, b);
  return 1 - (dist / maxLen);
}

function jaccard(setA, setB) {
  const a = new Set(setA), b = new Set(setB);
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function scoreMessageAgainstQA(message, qaRow) {
  const msgT = tokens(message);
  const qT = tokens(qaRow.question);
  const kw = (qaRow.keywords || "")
    .split(",")
    .map(s => normalizeText(s))
    .filter(Boolean);

  const overlapQ = jaccard(msgT, qT);
  const overlapKW = jaccard(msgT, kw);
  const sim = similarity(message, qaRow.question);

  // Težine: keywords su najvažnije, zatim sličnost, pa overlap sa pitanjem
  return (0.50 * overlapKW) + (0.30 * sim) + (0.20 * overlapQ);
}

export function pickBestAnswer(message, qaRows, minScore = 0.18) {
  const scored = qaRows
    .map(r => ({ row: r, score: scoreMessageAgainstQA(message, r) }))
    .sort((a,b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score < minScore) {
    return {
      answer: "Nisam siguran/na da razumem pitanje. Probaj da preformulišeš ili izaberi neko od predloga.",
      matched: null,
      suggestions: scored.slice(0, 5).map(x => ({ id: x.row.id, question: x.row.question }))
    };
  }

  const suggestions = scored
    .filter(x => x.row.id !== best.row.id)
    .slice(0, 3)
    .map(x => ({ id: x.row.id, question: x.row.question }));

  return {
    answer: best.row.answer,
    matched: { id: best.row.id, question: best.row.question, score: Number(best.score.toFixed(3)) },
    suggestions
  };
}