// Canonical host: everything lives on the main domain (David, 2026-10-20).
// Any visit to the *.onrender.com address is sent straight to mcqstayyari.online.
if (location.hostname.indexOf("onrender.com") !== -1) {
  location.replace("https://mcqstayyari.online" + location.pathname + location.search + location.hash);
}

/* MCQs Tayyari — shared app logic (no login, guest mode) */
(function(){
  "use strict";

  // Mobile menu
  var btn = document.getElementById("menuBtn"), nav = document.getElementById("mainNav");
  if(btn && nav){
    btn.addEventListener("click", function(){ nav.classList.toggle("open"); });
    nav.querySelectorAll("a").forEach(function(a){
      a.addEventListener("click", function(){ nav.classList.remove("open"); });
    });
    // active link
    var page = location.pathname.split("/").pop() || "/";
    nav.querySelectorAll("a").forEach(function(a){
      var href = a.getAttribute("href");
      if(href === page || (page === "" && href === "/")) a.classList.add("active");
    });
  }

  // FAQ accordion
  document.querySelectorAll(".faq-item").forEach(function(item){
    var q = item.querySelector(".faq-q"), a = item.querySelector(".faq-a");
    if(!q || !a) return;
    q.addEventListener("click", function(){
      var open = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach(function(o){
        o.classList.remove("open"); o.querySelector(".faq-a").style.maxHeight = null;
      });
      if(!open){ item.classList.add("open"); a.style.maxHeight = a.scrollHeight + "px"; }
    });
  });

  // Supabase client (lazy — only when configured)
  var sb = null;
  window.MT = {
    supabase: function(){
      if(sb) return sb;
      if(typeof supabase === "undefined") return null;
      if(!window.SUPABASE_URL || SUPABASE_URL.indexOf("YOUR_PROJECT") === 0) return null;
      sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return sb;
    },
    isConfigured: function(){
      return typeof SUPABASE_URL !== "undefined" && SUPABASE_URL.indexOf("YOUR_PROJECT") !== 0;
    },
    shuffle: function(arr){
      var a = arr.slice();
      for(var i = a.length - 1; i > 0; i--){
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },
    esc: function(s){
      return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
        return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
      });
    },
    // localStorage analytics (guest mode)
    stats: {
      get: function(){
        try{ return JSON.parse(localStorage.getItem("mt_stats") || "{}"); }catch(e){ return {}; }
      },
      record: function(subject, correct, total){
        try{
          var s = this.get();
          s[subject] = s[subject] || {asked:0, correct:0};
          s[subject].asked += total; s[subject].correct += correct;
          localStorage.setItem("mt_stats", JSON.stringify(s));
        }catch(e){}
      }
    }
  };

  // Render subject cards from Supabase (with counts) — falls back to static list
  window.MT_SUBJECTS = [
    {slug:"computer-science", name:"Computer Science", icon:"💻", desc:"Fundamentals, hardware, software and IT concepts."},
    {slug:"english", name:"English", icon:"🔤", desc:"Grammar, vocabulary, synonyms, antonyms, comprehension."},
    {slug:"urdu", name:"Urdu", icon:"📖", desc:"Urdu adab, grammar and classical literature."},
    {slug:"islamiyat", name:"Islamiyat", icon:"🕌", desc:"Seerah, pillars of Islam and Islamic history."},
    {slug:"everyday-science", name:"Everyday Science", icon:"🔬", desc:"Physics, chemistry and biology basics."},
    {slug:"pak-study", name:"Pak Study", icon:"🇵🇰", desc:"History, geography and constitution of Pakistan."},
    {slug:"general-knowledge", name:"General Knowledge", icon:"🌍", desc:"World GK, capitals, organizations, personalities."},
    {slug:"current-affairs", name:"Current Affairs", icon:"📰", desc:"National and international current affairs."},
    {slug:"basic-mathematics", name:"Basic Mathematics", icon:"➗", desc:"Arithmetic, algebra and problem solving for PPSC."},
    {slug:"past-papers", name:"Past Papers", icon:"📝", desc:"Solved PPSC past papers 1–1000, structured mocks."}
  ];

  window.MT_EXAMS = [
    {slug:"ppsc", name:"PPSC", full:"Punjab Public Service Commission", icon:"🎯", tag:"Most Popular", desc:"Lecturer, ASI, Patwari, Junior Clerk & all Punjab posts.", logo:"img/exams/logos/logo-ppsc.png",
     sim:{q:100,min:90,neg:0.25,pass:40},subjects:["computer-science","english","urdu","islamiyat","everyday-science","pak-study","general-knowledge","current-affairs","basic-mathematics","past-papers"],patternNote:"~80% post-related / ~20% General Ability (typical published split). −0.25 & 40% per official PPSC Manual of Policy Decision (regs 17.36–17.37); 100 MCQs / 90 min per PPSC syllabi.",seoTitle:"PPSC Test Preparation 2026 | PPSC MCQs, Past Papers & One Paper Guide",
     seoDesc:"Free PPSC test preparation 2026 — Punjab Public Service Commission MCQs, solved past papers, one-paper pattern guide and online practice. No login required.",
     h1:"PPSC Test Preparation 2026"},
    {slug:"fpsc", name:"FPSC", full:"Federal Public Service Commission", icon:"🏛️", tag:"", desc:"CSS, General Recruitment & all federal posts.", logo:"img/exams/logos/logo-fpsc.png",
     sim:{q:100,min:100,neg:0.25,pass:40},subjects:["english","everyday-science","pak-study","islamiyat","general-knowledge","current-affairs","basic-mathematics","computer-science","past-papers"],patternNote:"100 minutes, -0.25 and 40% pass per official FPSC notice 10-03-2026 (BS-16/17). English ~20% + General Ability/Professional ~80%.",seoTitle:"FPSC Test Preparation 2026 | FPSC MCQs, Past Papers & Federal Jobs",
     seoDesc:"Free FPSC test preparation — Federal Public Service Commission MCQs, solved past papers and practice tests for federal government jobs.",
     h1:"FPSC Test Preparation 2026"},
    {slug:"css", name:"CSS", full:"Central Superior Services", icon:"⭐", tag:"Prestigious", desc:"Pakistan's most prestigious exam, via FPSC.", logo:"img/exams/logos/logo-css.png",
     sim:{q:200,min:200,neg:0,pass:33},subjects:["computer-science","english","urdu","islamiyat","everyday-science","pak-study","general-knowledge","current-affairs","basic-mathematics","past-papers"],patternNote:"MPT screening pattern shown. Written papers are descriptive with a 20-MCQ objective section each (no negative marking); pass 40% per compulsory paper.",seoTitle:"CSS Exam Preparation 2026 | CSS MCQs, Past Papers & Complete Guide",
     seoDesc:"Free CSS exam preparation — Central Superior Services MCQs, solved past papers, compulsory subjects practice and complete CSS guide.",
     h1:"CSS Exam Preparation 2026"},
    {slug:"pms", name:"PMS", full:"Provincial Management Service", icon:"💼", tag:"", desc:"Provincial civil service examinations.", logo:"img/exams/logos/logo-pms.png",
     sim:{q:100,min:90,neg:0.25,pass:40},subjects:["english","urdu","islamiyat","pak-study","general-knowledge","current-affairs","everyday-science","past-papers"],patternNote:"General Knowledge paper is 100% objective (100 MCQs, -0.25); Islamiyat & Pakistan Affairs mix objective + subjective.",seoTitle:"PMS Exam Preparation 2026 | PMS MCQs, Past Papers & Provincial Tests",
     seoDesc:"Free PMS exam preparation — Provincial Management Service MCQs, solved past papers and practice tests.",
     h1:"PMS Exam Preparation 2026"},
    {slug:"spsc", name:"SPSC", full:"Sindh Public Service Commission", icon:"🌊", tag:"", desc:"All Sindh government posts.", logo:"img/exams/logos/logo-spsc.png",
     sim:{q:100,min:90,neg:0.25,pass:50},subjects:["english","islamiyat","everyday-science","pak-study","general-knowledge","current-affairs","basic-mathematics","computer-science","past-papers"],patternNote:"Typical screening pattern - varies by post/advertisement; some specialist tests have no negative marking.",seoTitle:"SPSC Test Preparation 2026 | Sindh Public Service Commission MCQs & Past Papers",
     seoDesc:"Free SPSC test preparation — Sindh Public Service Commission MCQs, solved past papers and online practice tests.",
     h1:"SPSC Test Preparation 2026"},
    {slug:"kppsc", name:"KPPSC", full:"Khyber Pakhtunkhwa PSC", icon:"🏔️", tag:"", desc:"All Khyber Pakhtunkhwa government posts.", logo:"img/exams/logos/logo-kppsc.png",
     sim:{q:100,min:90,neg:0,pass:20},subjects:["english","islamiyat","everyday-science","pak-study","general-knowledge","current-affairs","past-papers"],patternNote:"No negative marking per official KPPSC Regulations 2017. PMS screening syllabus: English / Current Affairs / EDS / Pak Affairs / Islamiat, 20 marks each.",seoTitle:"KPPSC Test Preparation 2026 | KP Public Service Commission MCQs & Past Papers",
     seoDesc:"Free KPPSC test preparation — Khyber Pakhtunkhwa Public Service Commission MCQs, solved past papers and practice tests.",
     h1:"KPPSC Test Preparation 2026"},
    {slug:"bpsc", name:"BPSC", full:"Balochistan Public Service Commission", icon:"🏜️", tag:"", desc:"All Balochistan government posts.", logo:"img/exams/logos/logo-bpsc.png",
     sim:{q:100,min:100,neg:0,pass:50},subjects:["english","islamiyat","everyday-science","pak-study","general-knowledge","current-affairs","basic-mathematics","past-papers"],patternNote:"Typical screening pattern - varies by post; figures are commonly published, not officially fixed.",seoTitle:"BPSC Test Preparation 2026 | Balochistan Public Service Commission MCQs & Past Papers",
     seoDesc:"Free BPSC test preparation — Balochistan Public Service Commission MCQs, solved past papers and online practice.",
     h1:"BPSC Test Preparation 2026"},
    {slug:"nts", name:"NTS", full:"National Testing Service", icon:"📝", tag:"", desc:"NAT, GAT-General & aptitude screening tests.", logo:"img/exams/logos/logo-nts.png",
     sim:{q:100,min:120,neg:0,pass:50},subjects:["english","basic-mathematics","past-papers"],patternNote:"NAT-II / GAT-General pattern shown (NAT-I: 90 MCQs). Sections: Verbal (English), Quantitative, Analytical + Subject. No negative marking.",seoTitle:"NTS Test Preparation 2026 | NTS MCQs, Past Papers, NAT & GAT Guide",
     seoDesc:"Free NTS test preparation — National Testing Service MCQs, solved past papers, NAT/GAT practice and screening test guide.",
     h1:"NTS Test Preparation 2026"},
    {slug:"pts", name:"PTS", full:"Pakistan Testing Service", icon:"📋", tag:"", desc:"Departmental screening & recruitment tests.", logo:"img/exams/logos/logo-pts.png",
     sim:{q:100,min:100,neg:0,pass:50},subjects:["computer-science","english","urdu","islamiyat","everyday-science","pak-study","general-knowledge","current-affairs","basic-mathematics","past-papers"],patternNote:"No universal pattern - each project sets its own criteria; typical screening shown.",seoTitle:"PTS Test Preparation 2026 | Pakistan Testing Service MCQs & Past Papers",
     seoDesc:"Free PTS test preparation — Pakistan Testing Service MCQs, solved past papers and screening test practice.",
     h1:"PTS Test Preparation 2026"},
    {slug:"ots", name:"OTS", full:"Open Testing Service", icon:"🗂️", tag:"", desc:"Recruitment tests across departments.", logo:"img/exams/logos/logo-ots.png",
     sim:{q:100,min:120,neg:0,pass:50},subjects:["english","islamiyat","everyday-science","pak-study","general-knowledge","current-affairs","basic-mathematics","computer-science","past-papers"],patternNote:"Typical screening pattern - varies by post; usually 100-200 MCQs with no negative marking.",seoTitle:"OTS Test Preparation 2026 | Open Testing Service MCQs & Past Papers",
     seoDesc:"Free OTS test preparation — Open Testing Service MCQs, solved past papers and recruitment test practice.",
     h1:"OTS Test Preparation 2026"},
    {slug:"cts", name:"CTS", full:"Central Testing Service", icon:"🗃️", tag:"", desc:"Screening & recruitment tests across departments.", logo:"img/exams/logos/logo-cts.png",
     sim:{q:100,min:100,neg:0,pass:50},subjects:["computer-science","english","urdu","islamiyat","everyday-science","pak-study","general-knowledge","current-affairs","basic-mathematics","past-papers"],patternNote:"No universal pattern - set per client; typical screening shown.",seoTitle:"CTS Test Preparation 2026 | Central Testing Service MCQs & Past Papers",
     seoDesc:"Free CTS test preparation — Central Testing Service MCQs, solved past papers and screening test practice.",
     h1:"CTS Test Preparation 2026"},
    {slug:"navttc", name:"NAVTTC", full:"National Vocational & Technical Training Commission", icon:"🛠️", tag:"New", desc:"Vocational & technical training admissions and job tests.", logo:"img/exams/logos/logo-navttc.png",
     sim:{q:100,min:90,neg:0,pass:50},subjects:["computer-science","english","urdu","islamiyat","everyday-science","pak-study","general-knowledge","current-affairs","basic-mathematics","past-papers"],patternNote:"No universal pattern - NAVTTC tests are usually conducted through designated testing services; typical screening shown.",seoTitle:"NAVTTC Test Preparation 2026 | NAVTTC MCQs, Past Papers & Guide",
     seoDesc:"Free NAVTTC test preparation — National Vocational & Technical Training Commission MCQs, solved past papers and screening test practice.",
     h1:"NAVTTC Test Preparation 2026"}
  ];

  // Render exam cards on homepage (populates #examGrid if present)
  (function(){
    var grid = document.getElementById("examGrid");
    if(!grid || !window.MT_EXAMS) return;
    MT_EXAMS.forEach(function(e){
      var d = document.createElement("div");
      d.className = "card";
      var visual = e.logo
        ? '<img class="exam-logo" src="'+e.logo+'" alt="'+MT.esc(e.seoTitle || e.name)+'" loading="lazy">'
        : '<div class="card-icon">'+e.icon+'</div>';
      d.innerHTML = visual
        + (e.tag ? '<div class="meta"><span class="badge live">'+MT.esc(e.tag)+'</span></div>' : '')
        + '<h3>'+MT.esc(e.h1 || e.name)+'</h3><p><strong>'+MT.esc(e.full)+'</strong><br>'+MT.esc(e.desc)+'</p>'
        + '<a class="btn btn-green" href="'+e.slug+'-test/">Open '+MT.esc(e.name)+' →</a>';
      grid.appendChild(d);
    });
  })();
})();


