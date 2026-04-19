async function waitForRuntimeEnv() {
  if (typeof window === "undefined") {
    return;
  }

  await window.__APP_ENV_READY__;
}

await waitForRuntimeEnv();
await import("./main");

export {};
