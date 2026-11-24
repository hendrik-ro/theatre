import express, { type Request, type Response } from "express";
import { pathToFileURL } from "url";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { logEvent } from "./logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { userRouter } from "./routes/users.js";
import { asyncHandler } from "./utils/asyncHandler.js";
import { authenticateJWT } from "./middleware/authenticateJWT.js";
import { closeDB, db } from "./db/index.js";
import { bootstrap } from "./db/schema/bootstrap.sql.js";
import { count } from "drizzle-orm";
import { requestLogger } from "./logger.js";
import moviesRouter from "./routes/movies.js";

const app = express();

const port = config.serverPort;
const allowedOrigins = config.allowedOrigins.split(",").map((o) => o.trim());

const corsOptions: cors.CorsOptions =
  config.env === "production"
    ? {
        origin: allowedOrigins,
        credentials: true,
      }
    : {
        origin: true,
        credentials: true,
      };

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        frameSrc: ["'self'"],
        upgradeInsecureRequest: null,
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xFrameOptions: { action: "sameorigin" },
    strictTransportSecurity: false,
  }),
);
app.use(cors(corsOptions));
app.use(express.json({ limit: "16kb" }));

app.get("/health", async (_req: Request, res: Response) => {
  try {
    await db.select({ count: count() }).from(bootstrap);
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
});

// Middleware
app.use(requestLogger);
app.use(asyncHandler(authenticateJWT));

// Routes
app.use("/users", userRouter);
app.use("/movies", moviesRouter);

// JSON 404 for unknown routes
// Express sens HTML page otherwise
app.use("/", (_req: Request, res: Response) => {
  res.status(404).json({ message: "Not found" });
});

app.use(errorHandler);

function startServer() {
  const server = app.listen(port, () => {
    logEvent("server_start", {
      port,
      env: config.env,
      node: process.version,
    });
  });

  function shutdown(signal: NodeJS.Signals) {
    logEvent("server_shutdown", {
      signal,
    });
    server.close(async () => {
      await closeDB().catch((err) => {
        logEvent("shutdown_error", err);
      });
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5_000).unref();
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) startServer();

export { app };
