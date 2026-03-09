import jwt from "jsonwebtoken";
import { db } from "./db.js";

const SECRET = process.env.JWT_SECRET || "dev-secret";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, SECRET);

    // Re-fetch user with current role from DB
    const user = db.prepare(`
      SELECT u.id, u.username, r.name AS role
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = ?
    `).get(payload.sub);

    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// requireRole("admin") or requireRole("admin", "editor")
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied: insufficient permissions" });
    }
    next();
  };
}

export { SECRET };
