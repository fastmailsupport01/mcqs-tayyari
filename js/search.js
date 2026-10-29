/* MCQs Tayyari — header site search (2026-10-29).
   Standalone: does NOT depend on js/app.js, so it works on every page that
   carries the header search box (including *-test/ and practice-set pages).
   Page search: client-side index (/js/search-index.json) — exams, subjects,
   board-paper sections, blog posts, eBooks, main pages. MCQ-question search
   additionally runs on pages where Supabase is configured (supabase client +
   js/config.js loaded); elsewhere it is silently skipped and page search
   still works. All result links are root-absolute so they work from any
   page depth. No heavy assets, no render-blocking behaviour (defer). */
(function () {
  "use strict";
  var box = document.querySelector(".site-search");
  if (!box) return;
  var input = box.querySelector("input[type=search]");
  var results = box.querySelector(".site-search-results");
  var btn = box.querySelector("button");
  if (!input || !results) return;

  var INDEX_URL = "/js/search-index.json";
  var index = null, indexPromise = null;
  var pageTimer = null, mcqTimer = null;
  var lastQuery = "";

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function hide() { results.hidden = true; results.innerHTML = ""; }
  function show() { results.hidden = false; }

  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (!indexPromise) {
      indexPromise = fetch(INDEX_URL).then(function (r) {
        if (!r.ok) throw new Error("index " + r.status);
        return r.json();
      }).then(function (j) {
        index = (j && j.entries) ? j.entries : [];
        return index;
      }).catch(function () {
        index = [];
        return index;
      });
    }
    return indexPromise;
  }

  function score(entry, q) {
    var t = (entry.t || "").toLowerCase();
    var k = (entry.k || "").toLowerCase();
    if (t.indexOf(q) === 0) return 3;
    if (t.indexOf(q) > -1) return 2;
    if (k.indexOf(q) > -1) return 1;
    return 0;
  }

  function pageResults(q) {
    if (!index) return [];
    var scored = [];
    for (var i = 0; i < index.length; i++) {
      var s = score(index[i], q);
      if (s > 0) scored.push({e: index[i], s: s});
    }
    scored.sort(function (a, b) { return b.s - a.s; });
    return scored.slice(0, 8).map(function (x) { return x.e; });
  }

  function render(pageItems, mcqItems) {
    var html = "";
    pageItems.forEach(function (e) {
      html += '<a href="' + esc(e.u) + '"><span class="sr-type">' + esc(e.c || "Page") +
        '</span><span class="sr-title">' + esc(e.t) + "</span></a>";
    });
    if (mcqItems && mcqItems.length) {
      mcqItems.forEach(function (m) {
        var sub = m.subject_slug || "";
        var url = sub ? "/practice?subject=" + encodeURIComponent(sub) : "/practice";
        var q = String(m.question || "").replace(/\s+/g, " ").trim();
        if (q.length > 90) q = q.slice(0, 90) + "…";
        html += '<a href="' + esc(url) + '"><span class="sr-type">MCQ</span>' +
          '<span class="sr-title">' + esc(q) + "</span></a>";
      });
    }
    if (!html) {
      html = '<div class="sr-empty">No matches — try an exam (PPSC, FPSC, CSS…), ' +
        'a subject, a board class, or a blog topic.</div>';
    }
    results.innerHTML = html;
    show();
  }

  function mcqConfigured() {
    try {
      return !!(window.MT && typeof MT.isConfigured === "function" &&
        MT.isConfigured() && window.supabase && typeof MT.supabase === "function");
    } catch (e) { return false; }
  }

  function runMcqSearch(q) {
    if (!mcqConfigured()) return;
    var safe = q.replace(/[\\%_]/g, function (c) { return "\\" + c; });
    try {
      MT.supabase().from("mcqs").select("question,subject_slug")
        .ilike("question", "%" + safe + "%").limit(8)
        .then(function (res) {
          if (lastQuery !== q) return;
          if (res && !res.error && res.data && res.data.length) {
            loadIndex().then(function () {
              render(pageResults(lastQuery), res.data);
            });
          }
        }).catch(function () {});
    } catch (e) {}
  }

  function onInput() {
    var q = input.value.trim().toLowerCase();
    lastQuery = q;
    if (q.length < 2) { hide(); return; }
    clearTimeout(pageTimer);
    pageTimer = setTimeout(function () {
      loadIndex().then(function () { render(pageResults(q), []); });
    }, 200);
    clearTimeout(mcqTimer);
    if (q.length >= 3) {
      mcqTimer = setTimeout(function () { runMcqSearch(q); }, 350);
    }
  }

  input.addEventListener("input", onInput);
  input.addEventListener("focus", function () {
    if (input.value.trim().length >= 2 && results.innerHTML) show();
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { hide(); input.blur(); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      var first = results.querySelector("a");
      if (first) window.location.href = first.getAttribute("href");
      else onInput();
    }
  });
  if (btn) btn.addEventListener("click", function () {
    var first = results.querySelector("a");
    if (first && !results.hidden) window.location.href = first.getAttribute("href");
    else { onInput(); input.focus(); }
  });
  document.addEventListener("click", function (e) {
    if (!box.contains(e.target)) hide();
  });
})();
