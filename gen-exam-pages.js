// Generates 11 static per-exam pages (ppsc.html, fpsc.html, ...) from MT_EXAMS + MT_SUBJECTS in js/app.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = __dirname;
const appSrc = fs.readFileSync(path.join(dir, "js", "app.js"), "utf8");

// Stub browser globals so app.js can run in Node
const stubEl = () => ({
  textContent: "", innerHTML: "", href: "", style: {},
  appendChild(){}, querySelector(){ return stubEl(); }, closest(){ return stubEl(); },
  querySelectorAll(){ return []; },
  parentNode: { insertBefore(){} }, classList: { add(){}, toggle(){}, remove(){} },
  addEventListener(){}, removeEventListener(){},
});
const sandbox = {
  window: {},
  document: {
    getElementById(){ return stubEl(); },
    querySelector(){ return stubEl(); },
    querySelectorAll(){ return []; },
    createElement(){ return stubEl(); },
    addEventListener(){},
  },
  localStorage: { getItem(){ return null; }, setItem(){} },
  location: { search: "", pathname: "/", hostname: "localhost" },
  URLSearchParams: function(){ this.get = () => null; },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(appSrc, sandbox);
const MT_EXAMS = sandbox.MT_EXAMS || sandbox.window.MT_EXAMS;
const MT_SUBJECTS = sandbox.MT_SUBJECTS || sandbox.window.MT_SUBJECTS;
if (!MT_EXAMS || !MT_SUBJECTS) { console.error("Could not load MT_EXAMS/MT_SUBJECTS"); process.exit(1); }

const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const subjBySlug = {};
MT_SUBJECTS.forEach(s => subjBySlug[s.slug] = s);

function examPage(ex) {
  const sim = ex.sim || {q:100,min:90,neg:0.25,pass:40};
  const subSlugs = ex.subjects || MT_SUBJECTS.map(s => s.slug);
  const subjects = subSlugs.map(sl => subjBySlug[sl]).filter(Boolean);
  const negTxt = sim.neg > 0 ? "\u2212" + sim.neg + " per wrong answer" : "None";
  const simDesc = (sim.neg > 0)
    ? "Timed MCQs with negative marking \u2014 the real exam feel."
    : "Timed MCQs, no negative marking \u2014 the real exam feel.";
  const logoHtml = ex.logo
    ? `<img class="exam-logo" src="${esc(ex.logo)}" alt="${esc(ex.seoTitle || ex.name)}" loading="lazy" style="width:110px;height:110px">`
    : "";

  const subjectCards = subjects.map(s => `
      <div class="card">
        <div class="card-icon">${s.icon}</div>
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.desc)}</p>
        <a class="btn btn-outline" href="practice?exam=${ex.slug}&subject=${s.slug}">Practice \u2192</a>
      </div>`).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(ex.seoTitle || (ex.name + " Test Preparation 2026 | MCQs Tayyari"))}</title>
<meta name="description" content="${esc(ex.seoDesc || ex.desc || "")}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://mcqstayyari.online/${ex.slug}">
<meta property="og:title" content="${esc(ex.seoTitle || ex.name)}">
<meta property="og:description" content="${esc(ex.seoDesc || ex.desc || "")}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://mcqstayyari.online/${ex.slug}">
<link rel="icon" href="favicon.png">
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<header class="site">
  <div class="wrap header-inner">
    <a class="brand" href="./"><img src="logo.png" alt="MCQs Tayyari logo"></a>
    <button class="menu-btn" id="menuBtn" aria-label="Menu">\u2630</button>
    <nav class="main-nav" id="mainNav">
      <a href="./">Home</a>
      <a href="subjects">Subjects</a><a href="blog">Blog</a>
      <a href="exam" class="nav-cta">Mock Test</a>
      <a href="about">About</a>
      <a href="contact">Contact</a>
    </nav>
  </div>
</header>

<section class="block">
  <div class="wrap">
    <div class="sec-head">
      <span class="sec-kicker" id="examKicker">${esc(ex.full || "")}</span>
      ${logoHtml}
      <h2 id="examName">${esc(ex.h1 || (ex.name + " Preparation"))}</h2>
      <p id="examDesc">${esc(ex.seoDesc || ex.desc || "")}</p>
    </div>

    <div class="sec-head" style="margin-bottom:26px">
      <h2 style="font-size:24px">\uD83D\uDCDA Subject-wise MCQs</h2>
      <p>Click any subject to start practicing for this exam \u2014 ${subjects.length} subjects in the ${esc(ex.name)} syllabus.</p>
    </div>
    <div class="grid" id="catSubjects" style="margin-bottom:56px">
${subjectCards}
    </div>

    <div class="sec-head" style="margin-bottom:26px">
      <span class="sec-kicker">${esc(ex.name)} Pattern Guide</span>
      <h2 style="font-size:24px">${esc(ex.name)} Exam Pattern</h2>
      <p>Know exactly what you're preparing for \u2014 our mock test mirrors this pattern.</p>
    </div>
    <div style="margin-bottom:56px">
      <table class="spec">
        <tr><th>Item</th><th>Details</th></tr>
        <tr><td>Total Questions</td><td>${sim.q} MCQs</td></tr>
        <tr><td>Total Marks</td><td>${sim.q}</td></tr>
        <tr><td>Duration</td><td>${sim.min} minutes</td></tr>
        <tr><td>Passing Marks</td><td>${sim.pass}%</td></tr>
        <tr><td>Negative Marking</td><td>${esc(negTxt)}</td></tr>
      </table>
      <p style="margin-top:12px;font-size:14px;color:#5a6b85">Note: ${esc(ex.patternNote || "")}</p>
    </div>

    <div class="sec-head" style="margin-bottom:26px">
      <h2 style="font-size:24px">\uD83D\uDCDA Books &amp; Notes</h2>
    </div>
    <div class="empty" style="margin-bottom:56px">
      <h3>Books coming soon</h3>
      <p>Recommended books and notes for ${esc(ex.name)} are being added \u2014 check back soon.</p>
    </div>

    <div class="sec-head" style="margin-bottom:26px">
      <h2 style="font-size:24px">\uD83D\uDCDD Past Papers &amp; Mock Test</h2>
    </div>
    <div class="grid" style="margin-bottom:20px">
      <div class="card">
        <div class="card-icon">\uD83D\uDCDD</div>
        <h3>Solved Past Papers</h3>
        <p>Previous papers for this exam, structured as practice sets.</p>
        <a class="btn btn-outline" href="practice?exam=${ex.slug}&subject=past-papers">Practice \u2192</a>
      </div>
      <div class="card">
        <div class="card-icon">\u23F1\uFE0F</div>
        <h3>${esc(ex.name)} Mock Test</h3>
        <p>${esc(simDesc)}</p>
        <a class="btn btn-orange" href="exam?exam=${ex.slug}">Start Mock Test \u2192</a>
      </div>
    </div>
  </div>
</section>

<div class="wrap"><div class="ad-slot"><span>Advertisement</span><div class="ad-note">AdSense ad unit \u2014 responsive</div></div></div>

<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand"><img src="logo.png" alt="MCQs Tayyari logo"><p>Free test preparation for all Pakistan competitive exams \u2014 subject-wise MCQs, past papers and real exam mock tests.</p></div>
      <div><h4>Quick Links</h4><ul><li><a href="./">Home</a></li><li><a href="subjects">Subjects</a></li><li><a href="blog">Blog</a></li><li><a href="exam">Mock Test</a></li><li><a href="about">About Us</a></li></ul></div>
      <div><h4>Exams</h4><ul>
        <li><a href="../ppsc-test/">PPSC</a></li><li><a href="../fpsc-test/">FPSC</a></li><li><a href="../css-test/">CSS</a></li><li><a href="../nts-test/">NTS</a></li>
      </ul></div>
      <div><h4>Legal</h4><ul><li><a href="privacy">Privacy Policy</a></li><li><a href="terms">Terms of Service</a></li><li><a href="contact">Contact Us</a></li></ul></div>
    </div>
    <div class="foot-bottom"><span>\u00A9 2026 MCQs Tayyari. All rights reserved.</span><span>Developed by <span class="credit">cos (chishti office sammundri)</span> \u00B7 +92 3264025618</span></div>
  </div>
</footer>
</body>
</html>
`;
}

let count = 0;
MT_EXAMS.forEach(ex => {
  const dirName = ex.slug + "-test";
  const fullDir = path.join(dir, dirName);
  if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });
  // page lives one level deeper now: fix relative links with ../
  let html = examPage(ex);
  html = html
    .replace('href="css/style.css"', 'href="../css/style.css"')
    .replace('href="favicon.png"', 'href="../favicon.png"')
    .replace(/src="logo\.png"/g, 'src="../logo.png"')
    .replace(/src="img\//g, 'src="../img/')
    .replace(/href="\.\/"/g, 'href="../"')
    .replace(/href="subjects\"/g, 'href="../subjects"')
    .replace(/href="blog\"/g, 'href="../blog"')
    .replace(/href="exam\.html/g, 'href="../exam')
    .replace(/href="practice\.html/g, 'href="../practice')
    .replace(/href="about\"/g, 'href="../about"')
    .replace(/href="contact\"/g, 'href="../contact"')
    .replace(/href="privacy\"/g, 'href="../privacy"')
    .replace(/href="terms\"/g, 'href="../terms"')
    .replace(`https://mcqstayyari.online/${ex.slug}.html`, `https://mcqstayyari.online/${dirName}/`);
  fs.writeFileSync(path.join(fullDir, "/"), html, "utf8");
  count++;
  console.log("wrote", dirName + "/");
});
console.log("DONE:", count, "pages");
