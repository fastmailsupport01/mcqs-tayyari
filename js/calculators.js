/* MCQs Tayyari — Board Calculators (Phase 1)
   No login, no server. Pure HTML/CSS/JS, instant results.
   Grade tables are exactly as in the Board Calculators Blueprint (1 Nov 2026). */
(function(){
  "use strict";

  function pct(obtained, total){
    if(!total || total <= 0) return 0;
    return Math.round(obtained / total * 10000) / 100;
  }

  // Old Punjab board system
  function gradeOld(p){
    if(p >= 80) return "A+";
    if(p >= 70) return "A";
    if(p >= 60) return "B";
    if(p >= 50) return "C";
    if(p >= 40) return "D";
    if(p >= 33) return "E";
    return "Fail";
  }

  // 2026 IBCC/Sindh grading reform
  function gradeNew(p){
    if(p >= 96) return "A++";
    if(p >= 91) return "A+";
    if(p >= 86) return "A";
    if(p >= 81) return "B++";
    if(p >= 76) return "B+";
    if(p >= 71) return "B";
    if(p >= 61) return "C+";
    if(p >= 51) return "C";
    if(p >= 40) return "D";
    return "U";
  }

  var POINTS = {"A":4.0,"A-":3.7,"B+":3.3,"B":3.0,"B-":2.7,"C+":2.3,"C":2.0,"C-":1.7,"D":1.0,"F":0};

  function gpa(rows){
    var num = 0, den = 0;
    rows.forEach(function(r){
      var p = POINTS[r.grade];
      if(p == null || !r.hours) return;
      num += p * r.hours; den += r.hours;
    });
    return den ? Math.round(num / den * 100) / 100 : 0;
  }

  function numVal(id){
    var v = parseFloat(document.getElementById(id).value);
    return isNaN(v) ? NaN : v;
  }

  function showErr(elId, msg){
    var el = document.getElementById(elId);
    if(el) el.innerHTML = '<div class="calc-error">' + msg + '</div>';
  }

  window.MTCalc = {pct: pct, gradeOld: gradeOld, gradeNew: gradeNew, gpa: gpa, numVal: numVal, showErr: showErr, POINTS: POINTS};
})();
