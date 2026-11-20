import "./load-env.js";
import express from "express";
import { databaseConfigured, setLocalDb } from "./db/pool.js";
import { studentsRouter } from "./routes/students.js";
import { visitsRouter } from "./routes/visits.js";
import { riskRouter } from "./routes/risk.js";
import { widerRouter } from "./routes/wider.js";
import { staffRouter } from "./routes/staff.js";

const databaseUrl = process.env.DATABASE_URL || "";
if (databaseUrl.includes("127.0.0.1") || databaseUrl.includes("localhost")) {
  const { startLocalDb } = await import("./local-db.js");
  setLocalDb(await startLocalDb());
}

const app = express();
const port = Number(process.env.API_PORT || process.env.PORT) || 3001;

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

app.get("/health", async (_req, res) => {
  if (!databaseConfigured) {
    res.json({
      ok: true,
      database: "missing",
      hint: "Add DATABASE_URL. Use the URI from Supabase → Project Settings → Database, with the real password, not the word [password].",
    });
    return;
  }
  try {
    const { query } = await import("./db/pool.js");
    await query("select 1 as ok");
    res.json({
      ok: true,
      database: "connected",
      mode: databaseUrl.includes("127.0.0.1") || databaseUrl.includes("localhost") ? "local" : "supabase",
    });
  } catch (error) {
    const message = String(error.message || "");
    const unreachable = message.includes("ENOTFOUND") || message.includes("ECONNREFUSED") || message.includes("timeout");
    res.status(503).json({
      ok: false,
      database: unreachable ? "unreachable" : "rejected",
      hint: unreachable
        ? "The host db.ffwcofcmsxulhtrbuiet.supabase.co does not resolve. Copy the connection string again from Supabase. The direct host may not exist yet."
        : "Postgres refused the login. Replace [password] with the database password from Supabase project settings.",
    });
  }
});

function requireDatabase(_req, res, next) {
  if (!databaseConfigured) {
    res.status(503).json({
      error: "Database not configured",
      hint: "Add DATABASE_URL to .env. The Supabase project is TheSHIS. Run server/schema.sql first.",
    });
    return;
  }
  next();
}

app.use("/staff", staffRouter);
app.use("/students", requireDatabase, studentsRouter);
app.use("/visits", requireDatabase, visitsRouter);
app.use("/risk", requireDatabase, riskRouter);
app.use("/", requireDatabase, widerRouter);

app.use((error, _req, res, _next) => {
  const message = String(error.message || "");
  const down =
    error.status === 503 ||
    message.includes("ENOTFOUND") ||
    message.includes("ECONNREFUSED") ||
    message.includes("password authentication failed") ||
    message.includes("tenant/user");
  if (!down) console.error(error);
  res.status(down ? 503 : error.status || 500).json({
    error: down ? "Database unreachable" : "Request failed",
    hint: down
      ? "Supabase did not accept DATABASE_URL. Copy a fresh URI from Project Settings → Database and replace the password."
      : undefined,
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(
    `[shis-api] listening on ${port}; database ${databaseConfigured ? "configured" : "not set yet"}`,
  );
});
