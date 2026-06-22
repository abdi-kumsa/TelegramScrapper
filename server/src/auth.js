import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "tg-collector-secret-change-in-production-2026";
const JWT_EXPIRY = "7d";

/**
 * Creates a signed JWT for the given user.
 */
export function createToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Express middleware that verifies the Bearer token on the request.
 * Attaches `req.user = { id, email }` on success.
 * Returns 401 if the token is missing, invalid, or expired.
 */
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorisation header." });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired. Please sign in again." });
    }
    return res.status(401).json({ error: "Invalid session token." });
  }
}
