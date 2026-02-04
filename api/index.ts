// @ts-nocheck
import express from "express";
import routes from "./routes.js";

const app = express();

// Stripe webhooks require the raw body to validate signatures.
app.use("/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS,PATCH");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

app.use(routes);

export default function handler(req: express.Request, res: express.Response) {
  return app(req, res);
}
