/* MCQs Tayyari — Past Papers "real template" shared logic.
   Used by past-papers (listing) and past-paper (paper view).
   Guest mode — no login. Pure helpers are also unit-tested in Node. */
(function(){
  "use strict";

  var CREDIT = "MCQs Tayyari \u2014 cos (chishti office sammundri) \u00B7 +92 3264025618";

  function examMeta(slug){
    var list = (typeof window !== "undefined" && window.MT_EXAMS) || [];
    for(var i = 0; i < list.length; i++){
      if(list[i].slug === slug) return list[i];
    }
    return {slug: slug, name: String(slug || "").toUpperCase() || "—", full: "", logo: ""};
  }

  /* Honesty badges — never label practice/reconstructed material as official.
     official_sourced + past_paper  -> PAST PAPER (sourced)
     community_sourced | unverified -> PAST PAPER (community)
     practice_set (any status)      -> PRACTICE SET */
  function badgeFor(p){
    if(!p) return {label: "PAST PAPER (community)", cls: "badge pp-community"};
    if(p.paper_kind === "practice_set") return {label: "PRACTICE SET", cls: "badge pp-practice"};
    if(p.verification_status === "official_sourced") return {label: "PAST PAPER (sourced)", cls: "badge pp-sourced"};
    return {label: "PAST PAPER (community)", cls: "badge pp-community"};
  }

  function fmtYear(y){
    return (y === null || y === undefined || y === "") ? "\u2014" : String(y);
  }
  function fmtDate(d){
    if(!d) return "\u2014";
    try{
      var dt = new Date(String(d).slice(0, 10) + "T00:00:00");
      if(isNaN(dt.getTime())) return "\u2014";
      return dt.toLocaleDateString("en-GB", {day: "numeric", month: "long", year: "numeric"});
    }catch(e){ return "\u2014"; }
  }
  function fmtTime(m){
    return (m === null || m === undefined || m === "") ? "\u2014" : String(m) + " min";
  }
  function fmtMarks(m){
    return (m === null || m === undefined || m === "") ? "\u2014" : String(m);
  }
  function fmtCount(n){
    return (n === null || n === undefined || n === "") ? "\u2014" : String(n);
  }
  function fmtNeg(n){
    if(!n || n === "none") return "None";
    return "\u2212" + String(n).replace(/^[-\u2212]/, "");
  }
  /* numeric negative marking for scoring, e.g. '-0.25' -> 0.25 ; 'none'/null -> 0 */
  function negValue(n){
    if(!n || n === "none") return 0;
    var v = parseFloat(String(n).replace(/[^0-9.]/g, ""));
    return isNaN(v) ? 0 : v;
  }

  function distinctYears(papers){
    var seen = {}, out = [];
    papers.forEach(function(p){
      if(p.year !== null && p.year !== undefined && p.year !== "" && !seen[p.year]){
        seen[p.year] = true; out.push(Number(p.year));
      }
    });
    out.sort(function(a, b){ return b - a; });
    return out;
  }
  function distinctSubjects(papers){
    var seen = {}, out = [];
    papers.forEach(function(p){
      if(p.subject && !seen[p.subject]){ seen[p.subject] = true; out.push(p.subject); }
    });
    out.sort();
    return out;
  }

  /* Client-side filters.
     f: {exam: slug|"", year: "unknown"|number|"", subject: ""|"name", q: ""|"text", kind: "all"|"past_paper"|"practice_set"} */
  function filterPapers(papers, f){
    f = f || {};
    return papers.filter(function(p){
      if(f.exam && p.exam_body !== f.exam) return false;
      if(f.year === "unknown"){
        if(p.year !== null && p.year !== undefined && p.year !== "") return false;
      } else if(f.year !== "" && f.year !== null && f.year !== undefined){
        if(Number(p.year) !== Number(f.year)) return false;
      }
      if(f.subject && (p.subject || "") !== f.subject) return false;
      if(f.kind === "past_paper" && p.paper_kind !== "past_paper") return false;
      if(f.kind === "practice_set" && p.paper_kind !== "practice_set") return false;
      if(f.q){
        var q = String(f.q).toLowerCase();
        var hay = ((p.post || "") + " " + (p.advertisement_no || "") + " " + (p.subject || "")).toLowerCase();
        if(hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  /* Supabase reads (graceful when the new table/columns don't exist yet) */
  function sb(){
    if(typeof window === "undefined" || !window.MT || !MT.isConfigured()) return null;
    return MT.supabase();
  }
  var MCQ_COLS = "id,question,option_a,option_b,option_c,option_d,correct_option,explanation,subject_slug,question_no";

  function fetchPapers(cb){
    var c = sb();
    if(!c){ cb([]); return; }
    c.from("past_papers").select("*").order("year", {ascending: false, nullsFirst: false}).order("exam_date", {ascending: false, nullsFirst: true})
      .then(function(res){
        if(res.error){ cb([]); return; }
        cb(res.data || []);
      }).catch(function(){ cb([]); });
  }
  function fetchPaper(id, cb){
    var c = sb();
    if(!c){ cb(null); return; }
    c.from("past_papers").select("*").eq("id", id).limit(1)
      .then(function(res){
        if(res.error || !res.data || !res.data.length){ cb(null); return; }
        cb(res.data[0]);
      }).catch(function(){ cb(null); });
  }
  function fetchPaperQuestions(paperId, cb){
    var c = sb();
    if(!c){ cb([]); return; }
    c.from("past_papers").select("id").limit(0).then(function(probe){
      if(probe.error){ cb([]); return; }  // table missing -> empty
      c.from("mcqs").select(MCQ_COLS).eq("past_paper_id", paperId)
        .order("question_no", {ascending: true, nullsFirst: false}).order("id", {ascending: true})
        .then(function(res){
          if(res.error){ cb([]); return; }
          cb(res.data || []);
        }).catch(function(){ cb([]); });
    }).catch(function(){ cb([]); });
  }

  var api = {
    CREDIT: CREDIT,
    examMeta: examMeta, badgeFor: badgeFor,
    fmtYear: fmtYear, fmtDate: fmtDate, fmtTime: fmtTime, fmtMarks: fmtMarks,
    fmtCount: fmtCount, fmtNeg: fmtNeg, negValue: negValue,
    distinctYears: distinctYears, distinctSubjects: distinctSubjects,
    filterPapers: filterPapers,
    fetchPapers: fetchPapers, fetchPaper: fetchPaper, fetchPaperQuestions: fetchPaperQuestions
  };
  if(typeof window !== "undefined") window.MT_PP = api;
  if(typeof module !== "undefined" && module.exports) module.exports = api;
})();
