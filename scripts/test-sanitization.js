import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  sanitizeArticleHtml,
  getDOMPurify,
  SANITIZE_ALLOWED_TAGS,
  SANITIZE_ALLOWED_ATTR,
} from "../src/utils/sanitizeHtml.js";

console.log("🧪 Running Regression Tests: Vulnerability 1 (Stored XSS Sanitization)...\n");

// Initialize JSDOM environment for Node.js testing
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://www.abhyudayaclub.in",
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;

// Ensure DOMPurify initializes with JSDOM
const purify = getDOMPurify(dom.window);
assert.ok(purify, "DOMPurify must initialize successfully in DOM environment");

// Test 1: Ordinary article HTML formatting remains intact
{
  const input = `
    <h1>Alumni Journey: From Campus to Microsoft</h1>
    <p>My 4-year journey at <strong>MPEC Kanpur</strong> taught me resilience.</p>
    <h2>Key Takeaways</h2>
    <ul>
      <li>Consistent DSA practice</li>
      <li>Open source contributions</li>
    </ul>
    <blockquote>Stay curious and humble.</blockquote>
    <p>Visit our website: <a href="https://www.abhyudayaclub.in">Abhyudaya Club</a></p>
    <figure>
      <img src="https://res.cloudinary.com/demo/image/upload/sample.jpg" alt="Campus Reunion" />
      <figcaption>2024 Alumni Meet</figcaption>
    </figure>
  `.trim();

  const output = sanitizeArticleHtml(input, { customWindow: dom.window });

  assert.ok(output.includes("<h1>Alumni Journey: From Campus to Microsoft</h1>"), "Heading 1 must be preserved");
  assert.ok(output.includes("<strong>MPEC Kanpur</strong>"), "Bold text must be preserved");
  assert.ok(output.includes("<h2>Key Takeaways</h2>"), "Heading 2 must be preserved");
  assert.ok(output.includes("<li>Consistent DSA practice</li>"), "List items must be preserved");
  assert.ok(output.includes("<blockquote>Stay curious and humble.</blockquote>"), "Blockquote must be preserved");
  assert.ok(output.includes('href="https://www.abhyudayaclub.in"'), "Safe HTTPS link must be preserved");
  assert.ok(output.includes('target="_blank"'), "Safe external link must automatically receive target='_blank'");
  assert.ok(output.includes('rel="noopener noreferrer"'), "External link must receive rel='noopener noreferrer'");
  assert.ok(output.includes('src="https://res.cloudinary.com/demo/image/upload/sample.jpg"'), "Safe image URL must be preserved");
  console.log("✓ Test 1 Passed: Legitimate article HTML formatting, lists, quotes, and images preserved.");
}

// Test 2: <script> tags are completely stripped and cannot execute
{
  const input = '<p>Normal text</p><script>alert("XSS-ATTACK")</script><script src="https://evil.com/payload.js"></script>';
  const output = sanitizeArticleHtml(input, { customWindow: dom.window });

  assert.strictEqual(output.includes("<script>"), false, "<script> tag must not exist in output");
  assert.strictEqual(output.includes("</script>"), false, "</script> tag must not exist in output");
  assert.strictEqual(output.includes("evil.com"), false, "External script source must not be present");
  assert.ok(output.includes("<p>Normal text</p>"), "Surrounding benign content must be preserved");
  console.log("✓ Test 2 Passed: Script tags completely removed from output.");
}

// Test 3: Inline event handlers (onerror, onload, onclick, onmouseover) are stripped
{
  const input = `
    <img src="invalid-image.png" onerror="alert(document.cookie)" />
    <svg onload="alert(1)"></svg>
    <a href="#" onclick="alert('click')">Click Me</a>
    <div onmouseover="alert('hover')">Hover Me</div>
    <body onload="alert('body')">Body test</body>
  `;

  const output = sanitizeArticleHtml(input, { customWindow: dom.window });

  assert.strictEqual(output.includes("onerror"), false, "onerror handler must be stripped");
  assert.strictEqual(output.includes("onload"), false, "onload handler must be stripped");
  assert.strictEqual(output.includes("onclick"), false, "onclick handler must be stripped");
  assert.strictEqual(output.includes("onmouseover"), false, "onmouseover handler must be stripped");
  assert.strictEqual(output.includes("<svg"), false, "svg tag must be stripped");
  console.log("✓ Test 3 Passed: All inline event handlers and forbidden tags stripped.");
}

// Test 4: Dangerous URL schemes (javascript:, vbscript:, data: for links) are neutralized
{
  const input = `
    <p><a href="javascript:alert('XSS')">Malicious Link 1</a></p>
    <p><a href="JAVASCRIPT:alert('UPPER')">Malicious Link 2</a></p>
    <p><a href="javascript&colon;alert('ENTITY')">Malicious Link 3</a></p>
    <p><a href="vbscript:msgbox('VBS')">VBScript Link</a></p>
    <p><a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Data URI Link</a></p>
    <p><a href="https://example.com/legit">Legitimate Link</a></p>
  `;

  const output = sanitizeArticleHtml(input, { customWindow: dom.window });

  assert.strictEqual(output.includes("javascript:"), false, "javascript: scheme must be neutralized");
  assert.strictEqual(output.includes("JAVASCRIPT:"), false, "uppercase JAVASCRIPT: scheme must be neutralized");
  assert.strictEqual(output.includes("vbscript:"), false, "vbscript: scheme must be neutralized");
  assert.strictEqual(output.includes("data:text/html"), false, "data: scheme on anchor must be neutralized");
  assert.ok(output.includes('href="https://example.com/legit"'), "Safe HTTPS link must remain functional");
  console.log("✓ Test 4 Passed: Dangerous URL schemes neutralized without breaking valid links.");
}

// Test 5: Nested/malformed HTML and bypass evasion techniques are safely handled
{
  const input = '<<SCRIPT>alert("NESTED");//<</SCRIPT>';
  const output = sanitizeArticleHtml(input, { customWindow: dom.window });
  assert.strictEqual(output.includes("<script"), false, "Nested script tags must not emerge");

  const unclosedInput = '<img src="valid.png" alt="test" <script>alert(1)</script>';
  const unclosedOutput = sanitizeArticleHtml(unclosedInput, { customWindow: dom.window });
  assert.strictEqual(unclosedOutput.includes("<script"), false, "Malformed unclosed tags must not execute scripts");
  console.log("✓ Test 5 Passed: Evasion attempts and malformed HTML neutralized.");
}

// Test 6: Empty, null, or non-string inputs fail safely
{
  assert.strictEqual(sanitizeArticleHtml(null), "", "null input must return empty string");
  assert.strictEqual(sanitizeArticleHtml(undefined), "", "undefined input must return empty string");
  assert.strictEqual(sanitizeArticleHtml(""), "", "empty string must return empty string");
  assert.strictEqual(sanitizeArticleHtml(12345), "", "number input must return empty string");
  assert.strictEqual(sanitizeArticleHtml({}), "", "object input must return empty string");
  console.log("✓ Test 6 Passed: Non-string and boundary inputs fail safely without throwing.");
}

console.log("\n🎉 All 6 Vulnerability 1 Sanitization Tests Passed Successfully!\n");
