/**
 * Task 143: the phone page — the thinnest possible slice of the chat
 * surface, served by the bridge as ONE self-contained file (embedded here,
 * so dev and packaged builds serve byte-identical pages with no asset
 * pipeline).
 *
 * Scope: pair, then watch. Status, the current conversation, and live
 * updates over SSE. No sending, no approvals — those are later tasks with
 * their own specs (approval parity is design decision 3, explicitly
 * deferred).
 *
 * Two disciplines hold everywhere in this file:
 * - Nothing the conversation says is ever written with innerHTML. Every
 *   owner/Cairn/card string goes through textContent, so model output can
 *   never become page script.
 * - The pairing screen on the DESKTOP carries the plain-HTTP disclosure
 *   sentence (the spec fixes it there); this page's pair form only points
 *   back at it.
 */

export const PHONE_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Cairn — phone</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: light-dark(#fbf7ee, #2c2842);
    --card: light-dark(#ffffff, #fffaf0);
    --ink: light-dark(#44423c, #f4ead9);
    --card-ink: light-dark(#44423c, #54452f);
    --card-muted: light-dark(#8a8375, #97856b);
    --muted: light-dark(#8a8375, #aaa0bc);
    --line: light-dark(#eae4d6, #5a5278);
    --green: light-dark(#7fae62, #9ec98a);
    --green-soft: light-dark(#e9f1e0, #26331f);
    --amber: light-dark(#b08a45, #f2b95c);
    --amber-soft: light-dark(#f7eeda, #3d3018);
    --stop: light-dark(#a96e63, #ff9e8a);
    --stop-soft: light-dark(#f6e9e6, #432c26);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font-family: ui-rounded, system-ui, -apple-system, "Segoe UI", sans-serif;
    line-height: 1.5;
  }
  header {
    position: sticky; top: 0; z-index: 1; background: var(--bg);
    border-bottom: 1px solid var(--line); padding: 10px 14px;
    display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
  }
  header .brand { font-weight: 700; }
  header .where { color: var(--muted); font-size: 13px; }
  header .live { margin-left: auto; font-size: 12px; color: var(--muted); }
  header .live.on { color: var(--green); }
  main { max-width: 640px; margin: 0 auto; padding: 14px 14px 40px; }
  .card {
    background: var(--card); border: 1px solid var(--line);
    border-radius: 22px; padding: 16px; margin: 12px 0; color: var(--card-ink);
  }
  .card-title {
    margin: 0 0 8px; font-size: 12px; letter-spacing: .12em;
    text-transform: lowercase; color: var(--card-muted);
  }
  .bubble {
    border-radius: 18px; padding: 10px 14px; margin: 8px 0;
    white-space: pre-wrap; word-wrap: break-word; max-width: 92%;
  }
  .bubble-owner { background: var(--green-soft); margin-left: auto; }
  .bubble-cairn { background: var(--card); border: 1px solid var(--line); color: var(--card-ink); }
  .bubble .who { display: block; font-size: 11px; color: var(--card-muted); margin-bottom: 2px; }
  .bubble .when, .turn-when { font-size: 11px; color: var(--card-muted); }
  .streaming { border-style: dashed; }
  .result-disposition { font-weight: 700; }
  .result-done { color: var(--green); }
  .result-stopped, .result-error { color: var(--stop); }
  .fact-list { margin: 8px 0 0; padding-left: 18px; font-size: 14px; }
  .claims { margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--line); font-size: 14px; }
  .muted { color: var(--card-muted); }
  .small { font-size: 13px; }
  input, button {
    font: inherit; border-radius: 14px; border: 1px solid var(--line);
    padding: 10px 14px; background: var(--card); color: var(--card-ink);
  }
  input { width: 100%; margin: 6px 0; }
  input.code { font-size: 24px; letter-spacing: .3em; text-align: center; }
  button { cursor: pointer; }
  button.primary { background: var(--green); border-color: var(--green); color: #fff; font-weight: 700; }
  button.quiet { background: transparent; border-color: transparent; color: var(--card-muted); }
  .error-line { color: var(--stop); }
  .footer-note { text-align: center; margin-top: 24px; }
</style>
</head>
<body>
<header>
  <span class="brand">Cairn</span>
  <span class="where" id="where"></span>
  <span class="live" id="live"></span>
</header>
<main id="root"></main>
<script>
(function () {
  "use strict";
  var root = document.getElementById("root");
  var where = document.getElementById("where");
  var live = document.getElementById("live");
  var source = null;
  var wasPaired = false;

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function fmtTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function showPairing(note) {
    if (source) { source.close(); source = null; }
    live.textContent = "";
    live.className = "live";
    where.textContent = "";
    root.textContent = "";
    var card = el("section", "card");
    card.appendChild(el("p", "card-title", "pair this phone"));
    card.appendChild(el("p", null, "On your computer, open Cairn, go to Settings, and under \\u201cpair a phone\\u201d choose \\u201cShow a pairing code\\u201d."));
    var form = el("form");
    var code = el("input", "code");
    code.setAttribute("inputmode", "numeric");
    code.setAttribute("autocomplete", "one-time-code");
    code.setAttribute("maxlength", "6");
    code.setAttribute("placeholder", "000000");
    code.setAttribute("aria-label", "Pairing code");
    var name = el("input");
    name.setAttribute("placeholder", "A name for this phone (optional)");
    name.setAttribute("maxlength", "60");
    name.setAttribute("aria-label", "Device name");
    var button = el("button", "primary", "Pair");
    button.type = "submit";
    var err = el("p", "error-line small");
    if (note) err.textContent = note;
    form.appendChild(code);
    form.appendChild(name);
    form.appendChild(button);
    card.appendChild(form);
    card.appendChild(err);
    root.appendChild(card);
    code.focus();
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      button.disabled = true;
      fetch("/api/pair", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.value, name: name.value })
      }).then(function (res) {
        if (res.ok) { start(); return null; }
        return res.text().then(function (text) {
          err.textContent = text || "That code didn\\u2019t work.";
          button.disabled = false;
        });
      }).catch(function () {
        err.textContent = "The computer couldn\\u2019t be reached. Is Cairn still running?";
        button.disabled = false;
      });
    });
  }

  function renderTurn(turn) {
    if (turn.role === "envelope") {
      var card = el("section", "card");
      card.appendChild(el("p", "card-title", "result card \\u2014 checked by Cairn"));
      var c = turn.card || {};
      var head = el("p", null);
      var disp = el("span", "result-disposition " + (c.disposition === "DONE" ? "result-done" : "result-stopped"), c.disposition || "?");
      head.appendChild(disp);
      if (c.taskNumber !== null && c.taskNumber !== undefined) {
        head.appendChild(document.createTextNode(" \\u2014 Task " + String(c.taskNumber).padStart(3, "0")));
      }
      card.appendChild(head);
      var facts = el("ul", "fact-list");
      if (c.protectedIntact === true) facts.appendChild(el("li", null, "Your starting work: untouched"));
      if (c.protectedIntact === false) facts.appendChild(el("li", null, "Your starting work: CHANGED \\u2014 the task stopped because of this"));
      if (typeof c.filesChanged !== "undefined") facts.appendChild(el("li", null, "Files changed (checked with Git): " + (c.filesChanged.length === 0 ? "none" : c.filesChanged.length)));
      if (c.commit) facts.appendChild(el("li", null, "Saved snapshot: " + c.commit));
      card.appendChild(facts);
      if (c.claims && c.claims.summary) {
        var claims = el("div", "claims");
        claims.appendChild(el("p", "small muted", "Worker\\u2019s account \\u2014 Cairn checked the files above, but not these descriptions"));
        claims.appendChild(el("strong", null, "What was done"));
        claims.appendChild(el("p", null, c.claims.summary));
        if (Array.isArray(c.claims.changes) && c.claims.changes.length) {
          var changes = el("ul", "fact-list");
          c.claims.changes.forEach(function (change) { changes.appendChild(el("li", null, change)); });
          claims.appendChild(changes);
        }
        claims.appendChild(el("strong", null, "What was checked"));
        var checks = el("ul", "fact-list");
        if (Array.isArray(c.claims.checks) && c.claims.checks.length) {
          c.claims.checks.forEach(function (check) { checks.appendChild(el("li", null, check.name + ": " + check.result)); });
        } else checks.appendChild(el("li", null, "No checks were reported."));
        claims.appendChild(checks);
        claims.appendChild(el("strong", null, "What to do next"));
        claims.appendChild(el("p", null, c.claims.howToTry || "No trial steps were reported."));
        claims.appendChild(el("strong", null, "What still needs your judgment"));
        claims.appendChild(el("p", null, c.claims.limitations || "The worker reported no remaining limitations."));
        card.appendChild(claims);
      }
      card.appendChild(el("p", "turn-when", fmtTime(turn.ts)));
      return card;
    }
    var bubble = el("div", "bubble " + (turn.role === "owner" ? "bubble-owner" : "bubble-cairn"));
    bubble.appendChild(el("span", "who", turn.role === "owner" ? "You" : "Cairn"));
    bubble.appendChild(document.createTextNode(turn.text));
    bubble.appendChild(el("span", "when", " "));
    bubble.appendChild(el("span", "when", fmtTime(turn.ts)));
    return bubble;
  }

  function render(state) {
    wasPaired = true;
    var status = state.status || {};
    where.textContent = state.project ? state.project.name : "no project open";
    var conn = status.connected
      ? status.provider + " \\u00b7 " + status.model
      : "not connected";
    root.textContent = "";
    var statusLine = el("p", "small muted", status.connected
      ? "Connected: " + conn
      : "Cairn isn\\u2019t connected to a provider on the computer right now.");
    root.appendChild(statusLine);

    var convo = state.conversation;
    if (!convo) {
      root.appendChild(el("p", "muted", "No conversation yet. Start one on the computer and it will appear here."));
    } else {
      var list = el("div");
      convo.turns.forEach(function (turn) { list.appendChild(renderTurn(turn)); });
      if (convo.streaming) {
        var bubble = el("div", "bubble bubble-cairn streaming");
        bubble.appendChild(el("span", "who", convo.streaming.kind === "commentary" ? "Cairn (commenting on the result card)" : "Cairn"));
        bubble.appendChild(document.createTextNode(convo.streaming.text || "\\u2026"));
        list.appendChild(bubble);
      }
      root.appendChild(list);
    }
    root.appendChild(el("p", "footer-note small muted", "Read-only for now \\u2014 sending from the phone comes in a later Cairn update."));
    if (window.scrollY + window.innerHeight > document.body.scrollHeight - 240) {
      window.scrollTo(0, document.body.scrollHeight);
    }
  }

  function start() {
    fetch("/api/state").then(function (res) {
      if (res.status === 401) { showPairing(); return null; }
      if (!res.ok) { showPairing("Something went wrong reaching the computer."); return null; }
      return res.json();
    }).then(function (state) {
      if (state === null) return;
      render(state);
      if (source) source.close();
      source = new EventSource("/api/stream");
      source.onopen = function () {
        live.textContent = "live";
        live.className = "live on";
      };
      source.onmessage = function (ev) {
        try { render(JSON.parse(ev.data)); } catch (e) { /* a malformed push is skipped, never fatal */ }
      };
      source.onerror = function () {
        live.textContent = "reconnecting\\u2026";
        live.className = "live";
        fetch("/api/state").then(function (res) {
          if (res.status === 401) {
            // The cookie stopped authenticating: this device was unpaired
            // on the computer (or its devices list was reset).
            showPairing(wasPaired ? "This device was unpaired from the computer. Pair again to keep watching." : undefined);
          }
        }).catch(function () { /* computer unreachable: EventSource keeps retrying */ });
      };
    }).catch(function () {
      showPairing("The computer couldn\\u2019t be reached. Is Cairn running and on the same Wi-Fi?");
    });
  }

  start();
})();
</script>
</body>
</html>
`;
