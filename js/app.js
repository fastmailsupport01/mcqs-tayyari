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
    var page = location.pathname.split("/").pop() || "index.html";
    nav.querySelectorAll("a").forEach(function(a){
      var href = a.getAttribute("href");
      if(href === page || (page === "" && href === "index.html")) a.classList.add("active");
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
    {slug:"ppsc", name:"PPSC", full:"Punjab Public Service Commission", icon:"🎯", tag:"Most Popular", desc:"Lecturer, ASI, Patwari, Junior Clerk & all Punjab posts."},
    {slug:"fpsc", name:"FPSC", full:"Federal Public Service Commission", icon:"🏛️", tag:"", desc:"CSS, General Recruitment & all federal posts."},
    {slug:"css", name:"CSS", full:"Central Superior Services", icon:"⭐", tag:"Prestigious", desc:"Pakistan's most prestigious exam, via FPSC."},
    {slug:"pms", name:"PMS", full:"Provincial Management Service", icon:"💼", tag:"", desc:"Provincial civil service examinations."},
    {slug:"spsc", name:"SPSC", full:"Sindh Public Service Commission", icon:"🌊", tag:"", desc:"All Sindh government posts."},
    {slug:"kppsc", name:"KPPSC", full:"Khyber Pakhtunkhwa PSC", icon:"🏔️", tag:"", desc:"All Khyber Pakhtunkhwa government posts."},
    {slug:"bpsc", name:"BPSC", full:"Balochistan Public Service Commission", icon:"🏜️", tag:"", desc:"All Balochistan government posts."},
    {slug:"nts", name:"NTS", full:"National Testing Service", icon:"📝", tag:"", desc:"Educators, police, banks & departmental tests."},
    {slug:"pts", name:"PTS", full:"Pakistan Testing Service", icon:"📋", tag:"", desc:"Departmental screening & recruitment tests."},
    {slug:"ots", name:"OTS", full:"Open Testing Service", icon:"🗂️", tag:"", desc:"Recruitment tests across departments."},
    {slug:"cts", name:"CTS", full:"Central Testing Service", icon:"🗃️", tag:"", desc:"Screening & recruitment tests across departments."}
  ];

  // Render exam cards on homepage (populates #examGrid if present)
  (function(){
    var grid = document.getElementById("examGrid");
    if(!grid) return;
    MT_EXAMS.forEach(function(e){
      var d = document.createElement("div");
      d.className = "card";
      d.innerHTML = '<div class="card-icon">'+e.icon+'</div>'
        + (e.tag ? '<div class="meta"><span class="badge live">'+MT.esc(e.tag)+'</span></div>' : '')
        + '<h3>'+MT.esc(e.name)+'</h3><p><strong>'+MT.esc(e.full)+'</strong><br>'+MT.esc(e.desc)+'</p>'
        + '<a class="btn btn-green" href="category.html?exam='+e.slug+'">Open '+MT.esc(e.name)+' →</a>';
      grid.appendChild(d);
    });
  })();
})();
