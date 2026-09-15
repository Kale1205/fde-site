import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
let firstCode;
for (const lang of ["en", "ja"]) {
  const prefix = lang === "ja" ? "ja/" : "";
  const html = read(prefix + "goals.html");
  for (const id of ["fde", "approach", "partnership"]) {
    assert.equal((html.match(new RegExp('id="' + id + '"', "g")) || []).length, 1);
    assert.ok(html.includes('href="#' + id + '"'));
  }
  assert.ok(!html.includes('href="why.html"'));
  assert.ok(html.includes('href="goals.html" aria-current="page"'));
  assert.ok(html.includes("Forward Deployed Engineering"));
  assert.ok(html.includes("License Plus"));
  const code = html.match(/<pre[^>]*>[\s\S]*?<code>([\s\S]*?)<\/code>/)[1].replace(/<[^>]*>/g, "").replace(/\s+/g, "");
  if (firstCode) assert.equal(code, firstCode);
  firstCode = code;
  for (const state of ["OutOfStock", "LowStock", "Healthy"]) assert.ok(code.includes(state));
  assert.ok(/<video[^>]*controls[^>]*muted[^>]*loop[^>]*playsinline[^>]*preload="none"/.test(html));
  assert.ok(html.includes('class="mission-transcript"'));
  const media = fs.readFileSync(path.join(root, "assets/ims-v1-operation-" + lang + ".mp4"));
  assert.ok(media.length > 1000, "Video must contain encoded media");
  assert.ok(media.subarray(0, 40).includes(Buffer.from("ftyp")), "Expected MP4 container");
  assert.ok(fs.statSync(path.join(root, "assets/ims-v1-operation-" + lang + "-poster.jpg")).size > 1000);
  const redirect = read(prefix + "why.html");
  assert.ok(redirect.includes('content="0;url=goals.html#fde"'));
  assert.ok(redirect.includes('content="noindex,follow"'));
  assert.ok(redirect.includes('/' + prefix + 'goals.html"'));
}
assert.ok(!read("sitemap.xml").includes("/why.html"));
assert.ok(read("gallery-ui.js").includes("prefers-reduced-motion: reduce"));
console.log("Merged Our Goals content, locale parity, redirects, real-media assets and motion guard checks passed.");
