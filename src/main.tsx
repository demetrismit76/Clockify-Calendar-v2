import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

const requiredEnvs = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;
const missing = requiredEnvs.filter((key) => !import.meta.env[key]);

if (missing.length > 0) {
  console.error("Missing required environment variables:", missing);
  root.render(
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Configuration Error</h1>
      <p style={{ color: "#666" }}>
        The app could not start because required environment variables are missing.
        If you're deploying to Cloudflare Pages, add <strong>{missing.join(", ")}</strong> in your project's environment settings and redeploy.
      </p>
    </div>
  );
} else {
  const App = React.lazy(() => import("./App"));
  root.render(
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 32, height: 32, border: "4px solid #888", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      }
    >
      <App />
    </Suspense>
  );
}
