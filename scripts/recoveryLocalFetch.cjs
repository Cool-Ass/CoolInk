// Applied only to disposable recovery children via NODE_OPTIONS, never deployed.
const fetchLocal = globalThis.fetch;
const drillHost = "3yn2rpuldwbtdc8w.private.blob.vercel-storage.com";
const privateReads = process.env.DRILL_MEDIA_RESTORE === "1"
  && process.env.DRILL_BLOB_READ_WRITE_TOKEN?.split("_")[3] === "3Yn2RpULDWBtDc8W";
function allowed(target, method = "GET") {
  return (target.protocol === "http:" && ["127.0.0.1", "localhost"].includes(target.hostname))
    || (privateReads && target.protocol === "https:" && target.hostname === drillHost
      && !target.port && ["GET", "HEAD"].includes(method.toUpperCase()));
}
globalThis.fetch = (input, init) => {
  const target = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (!allowed(target, init?.method || input?.method)) throw new Error("Recovery external fetch blocked");
  return fetchLocal(input, { ...init, redirect: "error" });
};
// The Blob SDK owns an Undici fetch, so guarding global fetch alone is insufficient.
const { Agent, setGlobalDispatcher } = require("undici");
const agent = new Agent();
setGlobalDispatcher({
  dispatch(options, handler) {
    if (!allowed(new URL(options.origin), options.method)) {
      queueMicrotask(() => handler.onError(new Error("Recovery external fetch blocked")));
      return false;
    }
    return agent.dispatch(options, handler);
  },
  close: (...args) => agent.close(...args),
  destroy: (...args) => agent.destroy(...args),
});
