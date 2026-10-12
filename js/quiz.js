/* MCQs Tayyari — quiz engines: practice mode + PPSC exam simulator.
   Data source: Supabase (tables: subjects, mcqs). Graceful empty-state when
   David hasn't added MCQs yet. Guest mode — no login. */
(function(){
  "use strict";

  function el(id){ return document.getElementById(id); }
  function showEmpty(boxId, title, msg){
    var box = el(boxId);
    if(box) box.innerHTML = '<div class="empty"><h3>'+MT.esc(title)+'</h3><p>'+MT.esc(msg)+'</p><a class="btn btn-green" href="subjects.html" style="margin-top:18px">Browse Subjects</a></div>';
  }

  /* ---------- fetch MCQs ---------- */
  function fetchMCQs(opts, cb){
    // opts: {subject (slug) | paperId, exam (slug), limit} — one request, or
    //        {all: true} — fetches EVERY matching row in 1000-row chunks so
    //        large subjects (2000+ MCQs) are fully available, not capped.
    // exam filter: MCQs tagged for that exam + untagged (shared) ones.
    // Falls back gracefully if the exam_body column doesn't exist yet.
    if(!MT.isConfigured()){ cb([]); return; }
    var cols = "id,question,option_a,option_b,option_c,option_d,correct_option,explanation,subject_slug,paper_id";
    var CHUNK = 1000;
    function buildQuery(withExam, from, to){
      var q = MT.supabase().from("mcqs").select(cols);
      if(opts.subject) q = q.eq("subject_slug", opts.subject);
      if(opts.paperId) q = q.eq("paper_id", opts.paperId);
      if(withExam && opts.exam) q = q.or("exam_body.eq."+opts.exam+",exam_body.is.null");
      q = q.order("id", {ascending: true});
      if(typeof from === "number") q = q.range(from, to);
      else q = q.limit(opts.limit || 200);
      return q;
    }
    function single(withExam){
      buildQuery(withExam).then(function(res){
        if(res.error){ if(withExam && opts.exam){ single(false); return; } cb([]); return; }
        cb(res.data || []);
      }).catch(function(){ if(withExam && opts.exam){ single(false); return; } cb([]); });
    }
    function fetchAll(withExam){
      // Chunked: keeps requesting until a chunk comes back short.
      var all = [], offset = 0;
      (function next(){
        buildQuery(withExam, offset, offset + CHUNK - 1).then(function(res){
          if(res.error){
            if(withExam && opts.exam){ fetchAll(false); return; }
            cb(all);
            return;
          }
          var rows = res.data || [];
          all = all.concat(rows);
          if(rows.length === CHUNK){ offset += CHUNK; next(); }
          else cb(all);
        }).catch(function(){ cb(all); });
      })();
    }
    if(opts.all) fetchAll(true); else single(true);
  }

  function toOptions(m){
    var opts = [
      {k:"A", t:m.option_a}, {k:"B", t:m.option_b},
      {k:"C", t:m.option_c}, {k:"D", t:m.option_d}
    ];
    return MT.shuffle(opts);
  }

  /* ---------- PRACTICE MODE (paginated: 20 MCQs per page) ---------- */
  // URL: practice.html?subject=english
  window.MT.startPractice = function(){
    var params = new URLSearchParams(location.search);
    var subject = params.get("subject");
    var examSlug = params.get("exam");
    var subjMeta = (MT_SUBJECTS || []).find(function(s){ return s.slug === subject; });
    var examMeta = examSlug ? (window.MT_EXAMS || []).find(function(e){ return e.slug === examSlug; }) : null;
    var titleEl = el("quizTitle");
    if(titleEl) titleEl.textContent = (subjMeta ? subjMeta.name : "Practice") + (examMeta ? " (" + examMeta.name + ")" : "") + " — Practice";

    var box0 = el("quizBox");
    if(box0) box0.innerHTML = '<div class="empty"><h3>Loading questions…</h3><p>Fetching the full question bank for this subject.</p></div>';
    fetchMCQs({subject: subject, exam: examSlug, all: true}, function(data){
      if(!data.length){
        showEmpty("quizBox", "MCQs coming soon",
          "Questions for this subject are being added. Check back soon — new sets drop regularly.");
        return;
      }
      runPractice(MT.shuffle(data), subjMeta ? subjMeta.name : subject);
    });
  };

  function runPractice(questions, subjectName){
    var box = el("quizBox");
    var perPage = 20;
    var totalPages = Math.max(1, Math.ceil(questions.length / perPage));
    var page = 1;
    var answers = {};                       // qi -> picked option "A".."D"
    var qopts = questions.map(function(m){ return toOptions(m); });  // shuffle once

    function score(){
      var a = 0, c = 0;
      questions.forEach(function(m, qi){
        if(answers[qi]){ a++; if(answers[qi] === m.correct_option) c++; }
      });
      return {a:a, c:c};
    }

    function qCard(m, qi, num){
      var html = '<div class="q-card" data-qi="'+qi+'">';
      html += '<div class="q-top"><span>Question '+num+'</span><span>'+MT.esc(subjectName)+'</span></div>';
      html += '<div class="q-text">'+MT.esc(m.question)+'</div><div class="opts">';
      qopts[qi].forEach(function(o){
        html += '<button class="opt" data-k="'+o.k+'">'+MT.esc(o.t)+'<span class="tick"></span></button>';
      });
      html += '</div><div class="explain"></div></div>';
      return html;
    }

    function lockCardVisual(card, qi){
      var m = questions[qi], pick = answers[qi];
      card.querySelectorAll(".opt").forEach(function(x){
        x.disabled = true;
        var k = x.getAttribute("data-k");
        if(k === m.correct_option){ x.classList.add("correct"); x.querySelector(".tick").textContent = "\u2713"; }
        else if(k === pick){ x.classList.add("wrong"); x.querySelector(".tick").textContent = "\u2717"; }
      });
      var ex = card.querySelector(".explain");
      ex.innerHTML = "<strong>Explanation:</strong> " + MT.esc(m.explanation || ("Correct answer is option " + m.correct_option + "."));
      ex.classList.add("show");
    }

    function pageNums(cur, total){
      var out = [];
      if(total <= 9){ for(var i=1;i<=total;i++) out.push(i); }
      else if(cur <= 5){ for(var i=1;i<=6;i++) out.push(i); out.push("\u2026"); out.push(total-1); out.push(total); }
      else if(cur >= total-4){ out.push(1); out.push("\u2026"); for(var i=total-5;i<=total;i++) out.push(i); }
      else { out.push(1); out.push("\u2026"); for(var i=cur-2;i<=cur+2;i++) out.push(i); out.push("\u2026"); out.push(total); }
      return out;
    }

    function pagerHtml(){
      var h = '<div class="pager">';
      h += '<button class="pg-btn" data-pg="'+(page-1)+'"'+(page===1?' disabled':'')+'>\u2039</button>';
      pageNums(page, totalPages).forEach(function(n){
        if(n === "\u2026") h += '<span class="pg-dots">\u2026</span>';
        else h += '<button class="pg-btn'+(n===page?' active':'')+'" data-pg="'+n+'">'+n+'</button>';
      });
      h += '<button class="pg-btn" data-pg="'+(page+1)+'"'+(page===totalPages?' disabled':'')+'>\u203a</button>';
      h += '</div>';
      h += '<div class="pg-goto"><input type="number" id="pgInput" min="1" max="'+totalPages+'" placeholder="Go to page number">'
        + '<button class="btn btn-green" id="pgGo">Go</button></div>';
      return h;
    }

    function updateScore(){
      var s = score();
      var strip = el("scoreStrip");
      if(strip) strip.innerHTML = '<span>Attempted: <b>'+s.a+'</b></span><span>Correct: <b>'+s.c+'</b></span><span>Total MCQs: <b>'+questions.length+'</b></span>';
    }

    function render(){
      var start = (page-1)*perPage;
      var slice = questions.slice(start, start+perPage);
      var html = '<div class="score-strip" id="scoreStrip"></div>';
      slice.forEach(function(m, i){ html += qCard(m, start+i, start+i+1); });
      html += pagerHtml();
      box.innerHTML = html;

      box.querySelectorAll(".q-card").forEach(function(card){
        var qi = parseInt(card.getAttribute("data-qi"), 10);
        if(answers[qi]){ lockCardVisual(card, qi); return; }
        card.querySelectorAll(".opt").forEach(function(b){
          b.addEventListener("click", function(){
            answers[qi] = b.getAttribute("data-k");
            lockCardVisual(card, qi);
            updateScore();
          });
        });
      });

      box.querySelectorAll(".pg-btn").forEach(function(b){
        if(b.disabled) return;
        b.addEventListener("click", function(){
          var p = parseInt(b.getAttribute("data-pg"), 10);
          if(p >= 1 && p <= totalPages && p !== page){
            page = p; render();
            window.scrollTo({top:0, behavior:"smooth"});
          }
        });
      });
      var go = el("pgGo");
      if(go) go.addEventListener("click", function(){
        var v = parseInt(el("pgInput").value, 10);
        if(v >= 1 && v <= totalPages && v !== page){
          page = v; render();
          window.scrollTo({top:0, behavior:"smooth"});
        }
      });
      updateScore();
    }
    render();
  }

  /* ---------- PER-EXAM SIMULATOR ---------- */
  // URL: exam.html?exam=ppsc — every exam gets its own branded simulator
  window.MT.startExam = function(){
    var box = el("examBox");
    var params = new URLSearchParams(location.search);
    var slug = params.get("exam") || "ppsc";
    var exams = window.MT_EXAMS || [];
    var ex = exams.find(function(e){ return e.slug === slug; }) || exams[0] || {name:"PPSC", slug:"ppsc", full:"", logo:"", sim:null};
    var sim = ex.sim || {q:100, min:90, neg:0.25, pass:40};
    var examName = ex.name || "PPSC";
    document.title = examName + " Mock Test | MCQs Tayyari";
    var h2 = document.querySelector(".sec-head h2");
    if(h2) h2.textContent = examName + " Mock Test";
    var kick = document.querySelector(".sec-head .sec-kicker");
    if(kick && ex.full) kick.textContent = ex.full;
    var sub = document.querySelector(".sec-head p");
    if(sub) sub.textContent = "Full-length mock test on our free exam simulator — " + sim.q + " questions, " + sim.min + " minutes, negative marking.";
    var logoHtml = ex.logo ? '<div><img class="exam-logo" src="'+ex.logo+'" alt="'+MT.esc(examName)+'" loading="lazy" style="width:96px;height:96px"></div>' : '';
    box.innerHTML = '<div class="result-card">'+logoHtml+'<span class="badge soon">'+MT.esc(examName)+' Mock Test</span>'
      + '<h2 style="margin:16px 0 8px">Choose Your Test Mode</h2>'
      + '<div class="result-meta"><div><b>'+sim.q+'</b>MCQs</div><div><b>'+sim.min+'</b>Minutes</div><div><b>\u2212'+sim.neg+'</b>Negative marking</div><div><b>'+sim.pass+'%</b>Pass marks</div></div>'
      + '<div class="mode-cards">'
      + '<div class="mode-card"><h3>\uD83D\uDDA5\uFE0F Online Mock Test</h3>'
      + '<p>Timed mock test on our exam simulator — instant green/red feedback with explanations, countdown timer, auto-submit.</p>'
      + '<button class="btn btn-green" id="beginCBT">Start Computer Test</button></div>'
      + '<div class="mode-card"><h3>\uD83D\uDCC4 Paper Mock Test</h3>'
      + '<p>Printable mock test paper + OMR-style answer sheet, exactly like the real paper test. Download as PDF with MCQs Tayyari branding.</p>'
      + '<button class="btn btn-orange" id="beginPaper">Open Paper Mode</button></div>'
      + '</div></div>';
    function loadQs(btnId, label, go){
      el(btnId).addEventListener("click", function(){
        var btn = el(btnId);
        btn.disabled = true; btn.textContent = "Loading questions…";
        fetchMCQs({exam: ex.slug, all: true}, function(data){
          if(data.length < 20){
            showEmpty("examBox", "Exam pool building",
              "We need more questions before the mock test can run. Question sets are being added — check back soon.");
            return;
          }
          go(MT.shuffle(data).slice(0, Math.min(sim.q, data.length)));
        });
      });
    }
    loadQs("beginCBT", 0, function(qs){ showCBTInstructions(qs, sim, ex); });
    loadQs("beginPaper", 0, function(qs){ renderPaper(qs, sim, ex); });
  };
  /* ---------- CBT: instructions screen ---------- */
  function showCBTInstructions(questions, sim, ex){
    var box = el("examBox");
    var examName = ex.name || "PPSC";
    var html = '<div class="cbt"><div class="cbt-instr">'
      + '<h2>'+MT.esc(examName)+' Mock Test</h2>'
      + '<div class="sub">Read the instructions carefully before starting the test.</div>'
      + '<h3>Test Pattern</h3><ul>'
      + '<li>Total questions: <b>'+questions.length+'</b> &nbsp;|&nbsp; Total marks: <b>'+questions.length+'</b> &nbsp;|&nbsp; Time: <b>'+sim.min+' minutes</b></li>'
      + '<li>Each correct answer: <b>+1 mark</b>. Each wrong answer: <b>\u2212'+sim.neg+' marks</b>. Skipped questions score <b>0</b>.</li>'
      + '<li>Qualifying score: <b>'+sim.pass+'%</b>.</li>'
      + '<li>The countdown timer runs at the top-right. The test <b>auto-submits</b> when time runs out.</li>'
      + '</ul><h3>How It Works</h3><ul>'
      + '<li>Click an option — you get <b>instant feedback</b>: correct answers turn <b style="color:#2f9e5f">green \u2713</b>, wrong ones turn <b style="color:#e05252">red \u2717</b>, with an explanation.</li>'
      + '<li>Move with <b>Back</b> / <b>Next</b>. Your answers stay saved as you move.</li>'
      + '<li>Submit anytime with the <b>Submit Test</b> button on the top bar.</li>'
      + '</ul>'
      + '<label class="cbt-agree"><input type="checkbox" id="cbtAgree"> <span>I have read all the instructions and the marking scheme above.</span></label>'
      + '<div><button class="cbt-start" id="cbtStart" disabled>Start Test</button></div>'
      + '<div class="cbt-disc">This mock test runs on the MCQs Tayyari exam simulator. It is not the official screen of any testing authority.</div>'
      + '</div></div>';
    box.innerHTML = html;
    el("cbtAgree").addEventListener("change", function(){ el("cbtStart").disabled = !this.checked; });
    el("cbtStart").addEventListener("click", function(){ renderCBT(questions, sim, ex); });
    window.scrollTo({top:0});
  }


  /* ---------- CBT: test screen ---------- */
  function cbtOverlay(html){
    cbtCloseOverlay();
    var d = document.createElement("div");
    d.className = "cbt-overlay"; d.id = "cbtOverlay";
    d.innerHTML = '<div class="cbt-dialog">'+html+'</div>';
    d.addEventListener("click", function(e){ if(e.target === d) cbtCloseOverlay(); });
    document.body.appendChild(d);
  }
  function cbtCloseOverlay(){
    var d = el("cbtOverlay");
    if(d && d.parentNode) d.parentNode.removeChild(d);
  }

  function renderCBT(questions, sim, ex){
    var box = el("examBox");
    var examName = ex.name || "PPSC";
    var examSlug = ex.slug || "ppsc";
    var total = questions.length;
    var timeLeft = sim.min * 60;
    var timerId = null, idx = 0;
    var answers = new Array(total).fill(null);
    var qopts = questions.map(function(m){ return toOptions(m); });

    function fmt(s){
      var m = Math.floor(s/60), ss = s%60;
      return (m<10?"0":"")+m+":"+(ss<10?"0":"")+ss;
    }
    function attempted(){
      var n = 0;
      for(var k=0;k<total;k++) if(answers[k] !== null) n++;
      return n;
    }

    function render(){
      var m = questions[idx], a = answers[idx];
      var done = attempted();
      var html = '<div class="cbt">'
        + '<div class="cbt-top"><div class="cbt-brand">'
        + (ex.logo ? '<img src="'+ex.logo+'" alt="">' : '')
        + '<span>'+MT.esc(examName)+'</span></div>'
        + '<span class="cbt-mode">MOCK TEST</span><span class="spacer"></span>'
        + '<span class="cbt-qcount">Question '+(idx+1)+' of '+total+'</span>'
        + '<span class="cbt-timer'+(timeLeft<300?' danger':'')+'" id="cbtTimer">'+fmt(Math.max(0,timeLeft))+'</span>'
        + '<button class="cbt-btn submit" id="submitBtn">Submit Test</button></div>'
        + '<div class="cbt-progress"><i style="width:'+Math.round(done/total*100)+'%"></i></div>'
        + '<div class="cbt-main solo"><div class="cbt-qarea">'
        + '<div class="cbt-qhead"><span class="cbt-qno">Question '+(idx+1)+'</span>'
        + '<span class="cbt-marks">Marks: <b>+1</b> <s>\u2212'+sim.neg+'</s></span></div>'
        + '<div class="cbt-qtext">'+MT.esc(m.question)+'</div><div class="cbt-opts">';
      qopts[idx].forEach(function(o){
        var cls = "cbt-opt", tick = "";
        if(a !== null){
          cls += " locked";
          if(o.k === m.correct_option){ cls += " correct"; tick = '<span class="tick">\u2713</span>'; }
          else if(o.k === a){ cls += " wrong"; tick = '<span class="tick">\u2717</span>'; }
          else { cls += " dim"; }
        }
        html += '<button class="'+cls+'" data-k="'+o.k+'"><span class="key">'+o.k+'</span><span>'+MT.esc(o.t)+'</span>'+tick+'</button>';
      });
      html += '</div>';
      if(a !== null){
        html += '<div class="cbt-explain"><strong>Explanation:</strong> '
          + MT.esc(m.explanation || ("Correct answer is option " + m.correct_option + ".")) + '</div>';
      }
      html += '<div class="cbt-actions">'
        + '<button class="cbt-act clear" id="backBtn"'+(idx===0 ? ' disabled style="opacity:.4;cursor:default"' : '')+'>\u2190 Back</button>'
        + '<span class="cbt-att">Answered: <b>'+done+' / '+total+'</b></span>'
        + (idx < total-1
            ? '<button class="cbt-act save" id="nextBtn">Next \u2192</button>'
            : '<button class="cbt-act save" id="nextBtn">See Result \u2192</button>')
        + '</div></div></div></div>';
      box.innerHTML = html;
      if(!timerId){
        timerId = setInterval(function(){
          timeLeft--;
          var t = el("cbtTimer");
          if(t){
            t.textContent = fmt(Math.max(0,timeLeft));
            if(timeLeft < 300) t.classList.add("danger");
          }
          if(timeLeft <= 0){ finish(true); }
        }, 1000);
      }
      bind();
      window.scrollTo({top:0});
    }

    function bind(){
      var m = questions[idx];
      if(answers[idx] === null){
        box.querySelectorAll(".cbt-opt").forEach(function(b){
          b.addEventListener("click", function(){
            if(answers[idx] !== null) return;
            answers[idx] = b.getAttribute("data-k");
            render();
          });
        });
      }
      var bb = el("backBtn");
      if(bb && idx > 0) bb.addEventListener("click", function(){ idx--; render(); });
      el("nextBtn").addEventListener("click", function(){
        if(idx < total-1){ idx++; render(); }
        else { showSubmitDialog(); }
      });
      el("submitBtn").addEventListener("click", showSubmitDialog);
    }

    function showSubmitDialog(){
      var done = attempted(), left = total - done;
      cbtOverlay('<h3>Submit Test?</h3>'
        + '<div class="cbt-sum">'
        + '<div><span class="cbt-dot a"></span>Answered: <b>'+done+'</b></div>'
        + '<div><span class="cbt-dot na"></span>Unanswered: <b>'+left+'</b></div>'
        + '</div>'
        + '<p style="font-size:14px;color:#42506a">Unanswered questions score 0. Wrong answers lose \u2212'+sim.neg+' each.</p>'
        + '<div class="cbt-dlg-btns">'
        + '<button class="cbt-no" id="dlgNo">Keep Solving</button>'
        + '<button class="cbt-yes" id="dlgYes">Yes, Submit</button></div>');
      el("dlgNo").addEventListener("click", cbtCloseOverlay);
      el("dlgYes").addEventListener("click", function(){ finish(false); });
    }

    function finish(auto){
      if(timerId){ clearInterval(timerId); timerId = null; }
      cbtCloseOverlay();
      var correct = 0, wrong = 0, skipped = 0;
      var review = [];
      questions.forEach(function(m, k){
        var a = answers[k];
        if(a === null) skipped++;
        else if(a === m.correct_option) correct++;
        else wrong++;
        review.push({m:m, a:a});
      });
      var score = correct - wrong * sim.neg;
      var pct = Math.round(score / total * 100);
      var pass = pct >= sim.pass;
      var html = '<div class="cbt"><div class="cbt-result"><div class="cbt-rcard">'
        + '<span class="badge '+(pass?'live':'soon')+'">'+(pass ? 'PASSED \u2713' : 'NOT QUALIFIED')+(auto ? ' (auto-submitted — time up)' : '')+'</span>'
        + '<div class="cbt-score">'+score.toFixed(2)+' / '+total+'</div>'
        + '<div style="color:#42506a;font-size:14.5px">'+pct+'% — qualifying score is '+sim.pass+'%</div>'
        + '<div class="cbt-break">'
        + '<div><b style="color:#2f9e5f">'+correct+'</b>Correct (+'+correct+')</div>'
        + '<div><b style="color:#e05252">'+wrong+'</b>Wrong (\u2212'+(wrong*sim.neg).toFixed(2)+')</div>'
        + '<div><b>'+skipped+'</b>Skipped</div>'
        + '</div>'
        + '<div class="btn-row" style="justify-content:center;display:flex;gap:10px;flex-wrap:wrap">'
        + '<a class="btn btn-orange" href="exam.html?exam='+examSlug+'">Retake Exam</a>'
        + '<a class="btn btn-green" href="subjects.html">Practice Subjects</a></div>'
        + '</div><div class="cbt-review"><h3 style="color:#16305b">Answer Review</h3>';
      review.forEach(function(r, k){
        var cls = r.a === null ? "soon" : (r.a === r.m.correct_option ? "live" : "soon");
        var mark = r.a === null ? "Skipped" : (r.a === r.m.correct_option ? "\u2713 Correct" : "\u2717 Wrong — you chose "+r.a+", answer is "+r.m.correct_option);
        html += '<div class="rv"><div class="rvq">'+(k+1)+'. '+MT.esc(r.m.question)+'</div>'
          + '<span class="badge '+cls+'">'+mark+'</span>'
          + (r.m.explanation ? '<div style="margin-top:10px;font-size:14.5px;color:#42506a">'+MT.esc(r.m.explanation)+'</div>' : '')
          + '</div>';
      });
      html += '</div></div></div>';
      box.innerHTML = html;
      window.scrollTo({top:0, behavior:"smooth"});
    }

    render();
  }

  /* ---------- PAPER MODE: printable question paper + OMR sheet ---------- */
  function renderPaper(questions, sim, ex){
    var box = el("examBox");
    var examName = ex.name || "PPSC";
    var total = questions.length;
    var dateStr = new Date().toLocaleDateString("en-GB", {day:"numeric", month:"long", year:"numeric"});
    var html = '<div class="paper-wrap">'
      + '<div class="paper-watermark" aria-hidden="true"><img src="logo.png" alt=""></div>'
      + '<div class="paper-toolbar no-print"><div><h2 style="margin:0">'+MT.esc(examName)+' — Original Paper Mode</h2>'
      + '<p style="margin:4px 0 0;color:var(--muted)">Printable question paper + OMR answer sheet with MCQs Tayyari branding.</p></div>'
      + '<button class="btn btn-orange" id="pdfBtn">\u2B07 Download PDF</button></div>'
      + '<div class="paper-sheet">'
      + '<div class="paper-head"><img src="logo.png" alt="MCQs Tayyari logo"><div class="paper-title">'
      + '<h2>MCQs Tayyari</h2><p>'+MT.esc(examName)+' Practice Question Paper</p></div></div>'
      + '<div class="paper-meta"><span>Total Questions: <b>'+total+'</b></span><span>Total Marks: <b>'+total+'</b></span>'
      + '<span>Time Allowed: <b>'+sim.min+' Minutes</b></span><span>Date: <b>'+dateStr+'</b></span></div>'
      + '<div class="paper-rules"><b>Instructions:</b><ol>'
      + '<li>Each question carries <b>1 mark</b>. Each wrong answer loses <b>\u2212'+sim.neg+' marks</b>. Unattempted questions score 0.</li>'
      + '<li>On the OMR sheet, fill the bubble <b>completely and darkly</b> with a blue or black ball-point pen.</li>'
      + '<li>Do not use tick marks, cross marks or correction fluid on the answer sheet.</li>'
      + '<li>Qualifying score: <b>'+sim.pass+'%</b>.</li></ol></div>'
      + '<div class="paper-qs">';
    questions.forEach(function(m, k){
      html += '<div class="pq"><div class="pq-q"><b>Q'+(k+1)+'.</b> '+MT.esc(m.question)+'</div><div class="pq-opts">'
        + '<span><b>A.</b> '+MT.esc(m.option_a)+'</span>'
        + '<span><b>B.</b> '+MT.esc(m.option_b)+'</span>'
        + '<span><b>C.</b> '+MT.esc(m.option_c)+'</span>'
        + '<span><b>D.</b> '+MT.esc(m.option_d)+'</span>'
        + '</div></div>';
    });
    html += '</div>'
      // OMR sheet page
      + '<div class="paper-omr"><h3>OMR Answer Sheet</h3>'
      + '<p class="omr-note">Correct (+1) &nbsp;&middot;&nbsp; Wrong (\u2212'+sim.neg+') &nbsp;&middot;&nbsp; Fill the circle of your chosen option completely.</p>'
      + '<div class="omr-fields"><span>Name: ______________________</span><span>Roll No: ______________</span><span>Date: ______________</span></div>'
      + '<div class="omr-grid">';
    var perCol = Math.ceil(total / 5);
    for(var c=0;c<5;c++){
      html += '<div class="omr-col">';
      for(var r=0;r<perCol;r++){
        var n = c*perCol + r;
        if(n >= total) break;
        html += '<div class="omr-row"><span class="omr-n">'+(n+1)+'</span>'
          + '<span class="omr-b">A</span><span class="omr-b">B</span><span class="omr-b">C</span><span class="omr-b">D</span></div>';
      }
      html += '</div>';
    }
    html += '</div>'
      + '<div class="paper-foot-brand">MCQs Tayyari &middot; mcqstayyari.online &middot; cos (chishti office sammundri) &middot; +92 3264025618</div>'
      + '</div></div></div>';
    box.innerHTML = html;
    el("pdfBtn").addEventListener("click", function(){ window.print(); });
    window.scrollTo({top:0});
  }

})();
