import rateLimit from "express-rate-limit";

// ── Rate limiters ─────────────────────────────────────────────────────────────

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many login attempts, please try again later." },
});

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many chat requests, please slow down." },
});

// ── XSS sanitization ─────────────────────────────────────────────────────────

function sanitizeStr(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
}

function deepSanitize(obj) {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "string") obj[key] = sanitizeStr(obj[key]);
    else if (typeof obj[key] === "object" && obj[key] !== null) deepSanitize(obj[key]);
  }
}

export function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === "object") deepSanitize(req.body);
  next();
}

// ── Security headers (XSS, clickjacking, MIME sniffing) ──────────────────────

export function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  );
  next();
}
