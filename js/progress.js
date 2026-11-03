/* MCQs Tayyari — Progress Tracker (Phase 1)
   No login, no server, no database. Scores are saved only in this
   browser's localStorage, on this device. Only working practice pages
   save scores — the /exam simulator is deliberately NOT connected. */
(function(){
  "use strict";
  var KEY = "mt_progress_v1";

  function esc(s){
    if(window.MT && MT.esc) return MT.esc(s);
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function load(){
    try{
      var v = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(v) ? v : [];
    }catch(e){ return []; }
  }

  function store(list){
    try{ localStorage.setItem(KEY, JSON.stringify(list)); }catch(e){}
  }

  // Save or update ONE record for a practice session. Called after every
  // answer, so the record grows with the session instead of creating a
  // new row per click. A new page load = a new session = a new row.
  function saveSession(sessionId, attempt){
    if(!attempt || !attempt.attempted) return;
    var list = load();
    var now = attempt.date || new Date().toISOString();
    var rec = {
      id: sessionId,
      date: now,
      test: attempt.test || "Practice",
      subject: attempt.subject || "",
      total: attempt.total || 0,
      attempted: attempt.attempted || 0,
      correct: attempt.correct || 0,
      wrong: attempt.wrong || 0,
      skipped: attempt.skipped || 0,
      percentage: attempt.percentage || 0
    };
    var i = -1;
    for(var k = 0; k < list.length; k++){ if(list[k].id === sessionId){ i = k; break; } }
    if(i >= 0){
      // Keep the session's first date, update only the counts.
      rec.date = list[i].date;
      list[i] = rec;
    } else {
      list.unshift(rec);
    }
    store(list);
  }

  function clear(){
    try{ localStorage.removeItem(KEY); }catch(e){}
  }

  function stats(){
    var list = load();
    var totalTests = list.length, totAtt = 0, totCor = 0, best = 0, lastDate = "";
    var bySubject = {};
    list.forEach(function(a){
      totAtt += a.attempted || 0; totCor += a.correct || 0;
      if((a.percentage || 0) > best) best = a.percentage || 0;
      if(!lastDate || a.date > lastDate) lastDate = a.date;
      var s = a.subject || "General";
      bySubject[s] = bySubject[s] || {attempts: 0, attempted: 0, correct: 0};
      bySubject[s].attempts++;
      bySubject[s].attempted += a.attempted || 0;
      bySubject[s].correct += a.correct || 0;
    });
    var subjects = Object.keys(bySubject).map(function(s){
      var b = bySubject[s];
      return {subject: s, attempts: b.attempts,
        avg: b.attempted ? Math.round(b.correct / b.attempted * 10000) / 100 : 0};
    }).sort(function(a, b){ return b.attempts - a.attempts; });
    return {
      list: list,
      totalTests: totalTests,
      overall: totAtt ? Math.round(totCor / totAtt * 10000) / 100 : 0,
      totalCorrect: totCor,
      totalAttempted: totAtt,
      best: best,
      lastDate: lastDate,
      subjects: subjects
    };
  }

  function dateLabel(iso){
    try{
      var d = new Date(iso);
      return d.toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric"})
        + " " + d.toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit"});
    }catch(e){ return iso || ""; }
  }

  window.MTProgress = {load: load, saveSession: saveSession, clear: clear, stats: stats, esc: esc, dateLabel: dateLabel};
})();
