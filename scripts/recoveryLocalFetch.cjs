// Applied only to disposable recovery children via NODE_OPTIONS, never deployed.
const fetchLocal = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const target = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (target.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(target.hostname)) throw new Error("Recovery external fetch blocked");
  return fetchLocal(input, { ...init, redirect: "error" });
};
