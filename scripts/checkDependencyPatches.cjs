const assert = require("node:assert/strict")
const { createRequire } = require("node:module")

// Check the module npm's release tooling actually resolves, including bundles.
const releaseRequire = createRequire(
  require.resolve("@semantic-release/npm"),
)
const npmRequire = createRequire(
  releaseRequire.resolve("npm/package.json"),
)
const cachePath = npmRequire.resolve("http-cache-semantics")
const CachePolicy = npmRequire("http-cache-semantics")
assert.equal(
  npmRequire("http-cache-semantics/package.json").version,
  "4.3.0",
)
const request = {
  url: "https://fixture.invalid/image",
  method: "GET",
  headers: { host: "fixture.invalid" },
}
for (const restriction of [
  "no-cache",
  "proxy-revalidate",
  "private",
  "no-store",
  "cookie",
]) {
  const response = {
    status: 200,
    headers: {
      date: new Date().toUTCString(),
      "cache-control":
        "max-age=1, " +
        (restriction === "cookie" ? "" : restriction),
      ...(restriction === "cookie"
        ? { "set-cookie": "fixture=1" }
        : {}),
    },
  }
  const policy = new CachePolicy(request, response)
  policy._responseTime -= 5000
  const result = policy.evaluateRequest({
    ...request,
    headers: {
      ...request.headers,
      "cache-control": "max-stale=999999",
    },
  })
  assert.equal(
    result.response,
    undefined,
    `${restriction} cannot bypass response restrictions`,
  )
}
const parse = require("braces/lib/parse")
assert.throws(
  () =>
    parse(`${"(".repeat(120)}fixture${")".repeat(120)}`),
  /nesting depth/,
)
console.log(
  JSON.stringify({
    cachePath,
    cacheVersion: "4.3.0",
    restrictedResponses: 5,
    nestingBound: true,
  }),
)
