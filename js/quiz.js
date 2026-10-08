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
    // opts: {subject (slug) | paperId, limit}
    if(!MT.isConfigured()){ cb([]); return; }
    var q = MT.supabase().from("mcqs").select("id,question,option_a,option_b,option_c,option_d,correct_option,explanation,subject_slug,paper_id");
    if(opts.subject) q = q.eq("subject_slug", opts.subject);
    if(opts.paperId) q = q.eq("paper_id", opts.paperId);
    q.limit(opts.limit || 200).then(function(res){
      if(res.error){ cb([]); return; }
      cb(res.data || []);
    }).catch(function(){ cb([]); });
  }

  function toOptions(m){
    var opts = [
      {k:"A", t:m.option_a}, {k:"B", t:m.option_b},
      {k:"C", t:m.option_c}, {k:"D", t:m.option_d}
    ];
    return MT.shuffle(opts);
  }

  /* ---------- PRACTICE MODE ---------- */
  // URL: practice.html?subject=english
  window.MT.startPractice = function(){
    var params = new URLSearchParams(location.search);
    var subject = params.get("subject");
    var subjMeta = (MT_SUBJECTS || []).find(function(s){ return s.slug === subject; });
    var titleEl = el("quizTitle");
    if(titleEl) titleEl.textContent = subjMeta ? subjMeta.name + " — Practice" : "Practice";

    fetchMCQs({subject: subject, limit: 100}, function(data){
      if(!data.length){
        showEmpty("quizBox", "MCQs coming soon",
          "Questions for this subject are being added. Check back soon — new sets drop regularly.");
        return;
      }
      runPractice(MT.shuffle(data).slice(0, 20), subjMeta ? subjMeta.name : subject);
    });
  };

  function runPractice(questions, subjectName){
    var idx = 0, correct = 0, answered = 0;
    var box = el("quizBox");

    function render(){
      var m = questions[idx];
      var opts = toOptions(m);
      var html = '<div class="progress"><i style="width:'+Math.round(idx/questions.length*100)+'%"></i></div>';
      html += '<div class="q-card"><div class="q-top"><span>Question '+(idx+1)+' of '+questions.length+'</span><span>'+MT.esc(subjectName)+'</span></div>';
      html += '<div class="q-text">'+MT.esc(m.question)+'</div><div class="opts">';
      opts.forEach(function(o){
        html += '<button class="opt" data-k="'+o.k+'">'+MT.esc(o.t)+'<span class="tick"></span></button>';
      });
      html += '</div><div class="explain" id="explainBox"></div>';
      html += '<div class="q-nav"><button class="btn btn-outline" id="skipBtn">Skip</button>';
      html += '<button class="btn btn-green" id="nextBtn" style="display:none">Next →</button></div></div>';
      box.innerHTML = html;

      var locked = false;
      box.querySelectorAll(".opt").forEach(function(b){
        b.addEventListener("click", function(){
          if(locked) return; locked = true;
          answered++;
          var pick = b.getAttribute("data-k");
          var ok = (pick === m.correct_option);
          if(ok) correct++;
          box.querySelectorAll(".opt").forEach(function(x){
            x.disabled = true;
            var k = x.getAttribute("data-k");
            if(k === m.correct_option){ x.classList.add("correct"); x.querySelector(".tick").textContent = "✓"; }
            else if(x === b){ x.classList.add("wrong"); x.querySelector(".tick").textContent = "✗"; }
          });
          var ex = el("explainBox");
          ex.innerHTML = "<strong>Explanation:</strong> " + MT.esc(m.explanation || "Correct answer is option " + m.correct_option + ".");
          ex.classList.add("show");
          el("nextBtn").style.display = "";
          el("skipBtn").style.display = "none";
        });
      });
      el("skipBtn").addEventListener("click", next);
      el("nextBtn").addEventListener("click", next);
      function next(){
        idx++;
        if(idx >= questions.length) return finish();
        render();
      }
    }
    function finish(){
      MT.stats.record(subjectName, correct, answered);
      box.innerHTML = '<div class="result-card"><span class="badge live">Practice complete</span>'
        + '<div class="result-score">'+correct+'/'+questions.length+'</div>'
        + '<p style="color:var(--muted)">You attempted '+answered+' questions in '+MT.esc(subjectName)+'.</p>'
        + '<div class="btn-row" style="justify-content:center;margin-top:24px">'
        + '<a class="btn btn-orange" href="practice.html?subject='+encodeURIComponent(subjectName === "Past Papers" ? "past-papers" : "")+'">Retry</a>'
        + '<a class="btn btn-green" href="subjects.html">More Subjects</a></div></div>';
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
    document.title = examName + " Practice Simulator | MCQs Tayyari";
    var h2 = document.querySelector(".sec-head h2");
    if(h2) h2.textContent = examName + " Practice Simulator";
    var kick = document.querySelector(".sec-head .sec-kicker");
    if(kick && ex.full) kick.textContent = ex.full;
    var sub = document.querySelector(".sec-head p");
    if(sub) sub.textContent = "Practice like the real exam — " + sim.q + " questions, " + sim.min + " minutes, negative marking.";
    var logoHtml = ex.logo ? '<div><img class="exam-logo" src="'+ex.logo+'" alt="'+MT.esc(examName)+'" loading="lazy" style="width:96px;height:96px"></div>' : '';
    box.innerHTML = '<div class="result-card">'+logoHtml+'<span class="badge soon">'+MT.esc(examName)+' Practice Simulator</span>'
      + '<h2 style="margin:16px 0 8px">Simulator Settings</h2>'
      + '<div class="result-meta"><div><b>'+sim.q+'</b>MCQs</div><div><b>'+sim.min+'</b>Minutes</div><div><b>\u2212'+sim.neg+'</b>Negative marking</div><div><b>'+sim.pass+'%</b>Pass marks</div></div>'
      + '<p style="color:var(--muted);max-width:520px;margin:0 auto 24px">'+sim.q+' questions pulled across all subjects. Wrong answers cost '+sim.neg+' marks.</p>'
      + '<button class="btn btn-orange" id="beginExam">Start Exam</button></div>';
    el("beginExam").addEventListener("click", function(){
      fetchMCQs({limit: 400}, function(data){
        if(data.length < 20){
          showEmpty("examBox", "Exam pool building",
            "We need more questions before the simulator can run a full exam. Question sets are being added — check back soon.");
          return;
        }
        runExam(MT.shuffle(data).slice(0, Math.min(sim.q, data.length)), sim, ex.slug);
      });
    });
  };
  function runExam(questions, sim, examSlug){
    sim = sim || {q:100, min:90, neg:0.25, pass:40};
    examSlug = examSlug || "ppsc";
    var box = el("examBox");
    var idx = 0, answers = new Array(questions.length).fill(null);
    var total = questions.length, timeLeft = sim.min * 60, timerId = null;

    function fmt(s){
      var m = Math.floor(s/60), ss = s%60;
      return (m<10?"0":"")+m+":"+(ss<10?"0":"")+ss;
    }
    function render(){
      var m = questions[idx];
      var opts = toOptions(m);
      var html = '<div class="progress"><i style="width:'+Math.round(idx/total*100)+'%"></i></div>';
      html += '<div class="q-card"><div class="q-top"><span>Question '+(idx+1)+' of '+total+'</span><span class="q-timer" id="examTimer">'+fmt(timeLeft)+'</span></div>';
      html += '<div class="q-text">'+MT.esc(m.question)+'</div><div class="opts">';
      opts.forEach(function(o){
        var sel = answers[idx] === o.k ? ' style="border-color:var(--green);background:var(--green-light)"' : '';
        html += '<button class="opt" data-k="'+o.k+'"'+sel+'>'+MT.esc(o.t)+'</button>';
      });
      html += '</div><div class="q-nav"><button class="btn btn-outline" id="prevQ"'+(idx===0?" disabled style='opacity:.4'":"")+'>← Back</button>';
      if(idx < total-1) html += '<button class="btn btn-green" id="nextQ">Next →</button>';
      else html += '<button class="btn btn-orange" id="finishExam">Finish Exam</button>';
      html += '</div></div>';
      box.innerHTML = html;
      startTimer();
      box.querySelectorAll(".opt").forEach(function(b){
        b.addEventListener("click", function(){
          answers[idx] = b.getAttribute("data-k");
          box.querySelectorAll(".opt").forEach(function(x){
            x.style.borderColor=""; x.style.background="";
          });
          b.style.borderColor = "var(--green)"; b.style.background = "var(--green-light)";
        });
      });
      var pq = el("prevQ"); if(pq && idx>0) pq.addEventListener("click", function(){ idx--; render(); });
      var nq = el("nextQ"); if(nq) nq.addEventListener("click", function(){ idx++; render(); });
      var fe = el("finishExam"); if(fe) fe.addEventListener("click", finish);
    }
    function startTimer(){
      if(timerId) return;
      timerId = setInterval(function(){
        timeLeft--;
        var t = el("examTimer");
        if(t){ t.textContent = fmt(Math.max(0,timeLeft)); if(timeLeft < 300) t.classList.add("warn"); }
        if(timeLeft <= 0){ clearInterval(timerId); finish(); }
      }, 1000);
    }
    function finish(){
      if(timerId) clearInterval(timerId);
      var correct = 0, wrong = 0, skipped = 0;
      var review = [];
      questions.forEach(function(m, i){
        var a = answers[i];
        if(a === null){ skipped++; }
        else if(a === m.correct_option){ correct++; }
        else { wrong++; }
        review.push({m:m, a:a});
      });
      var score = correct - wrong * sim.neg;
      var pct = Math.round(score / total * 100);
      var pass = pct >= sim.pass;
      var html = '<div class="result-card"><span class="badge '+(pass?"live":"soon")+'">'+(pass?"PASSED ✓":"NOT QUALIFIED")+'</span>'
        + '<div class="result-score">'+score.toFixed(2)+' / '+total+'</div>'
        + '<div class="result-meta"><div><b>'+correct+'</b>Correct</div><div><b>'+wrong+'</b>Wrong (−'+sim.neg+' each)</div><div><b>'+skipped+'</b>Skipped</div><div><b>'+pct+'%</b>Score</div></div>'
        + '<h3 style="text-align:left;margin:26px 0 14px">Answer Review</h3><div style="text-align:left">';
      review.forEach(function(r, i){
        var cls = r.a === null ? "soon" : (r.a === r.m.correct_option ? "live" : "soon");
        var mark = r.a === null ? "Skipped" : (r.a === r.m.correct_option ? "✓ Correct" : "✗ Wrong (you: "+r.a+", answer: "+r.m.correct_option+")");
        html += '<div class="q-card" style="padding:20px;margin-bottom:14px"><div style="font-weight:700;margin-bottom:8px">'+(i+1)+'. '+MT.esc(r.m.question)+'</div>'
          + '<span class="badge '+cls+'">'+mark+'</span>'
          + (r.m.explanation ? '<div style="margin-top:10px;font-size:14.5px;color:var(--muted)">'+MT.esc(r.m.explanation)+'</div>' : '')
          + '</div>';
      });
      html += '</div><div class="btn-row" style="justify-content:center;margin-top:20px"><a class="btn btn-orange" href="exam.html?exam='+examSlug+'">Retake Exam</a><a class="btn btn-green" href="subjects.html">Practice Subjects</a></div></div>';
      box.innerHTML = html;
      window.scrollTo({top:0, behavior:"smooth"});
    }
    render();
  }
})();
