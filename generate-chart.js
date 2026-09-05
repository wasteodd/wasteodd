import fs from 'fs';

const TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = 'wasteodd';

const query = `
  query {
    user(login: "${USERNAME}") {
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalIssueContributions
        contributionCalendar {
          weeks {
            contributionDays {
              contributionCount
              date
            }
          }
        }
      }
    }
  }
`;

async function fetchData() {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query })
  });
  
  const json = await response.json();
  return json.data.user.contributionsCollection;
}

// ۱. تولید گراف اول (تقویم جنگلی سه‌بعدی)
function generateForestCalendar(weeks) {
  let svg = `<svg width="850" height="350" viewBox="0 0 850 350" xmlns="http://www.w3.org/2000/svg">\n`;
  svg += `<style>
    .bg { fill: #0a0a0a; }
    .tile-top { fill: #1f1f1f; stroke: #333; stroke-width: 0.5; }
    .tile-left { fill: #141414; stroke: #333; stroke-width: 0.5; }
    .tile-right { fill: #0d0d0d; stroke: #333; stroke-width: 0.5; }
    .stem { stroke: #e6e6e6; stroke-linecap: round; stroke-linejoin: round; }
    .leaf { fill: #e6e6e6; }
    .grow { transform-origin: bottom center; animation: sprout 1.5s forwards; opacity: 0; }
    .hover-float { transition: transform 0.3s ease; }
    .hover-float:hover { transform: translateY(-5px); }
    @keyframes sprout { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
  </style>\n`;
  svg += `<rect width="100%" height="100%" class="bg" />\n`;
  svg += `<text x="25" y="35" font-family="monospace" font-size="14" fill="#888" letter-spacing="2">CONTRIBUTION FOREST</text>\n`;
  svg += `<g transform="translate(425, 80)">\n`;

  const tile_w = 12, tile_h = 6, depth = 4;
  let cells = [];
  weeks.forEach((week, w_idx) => {
    week.contributionDays.forEach((day, d_idx) => {
      cells.push({ x: w_idx, y: d_idx, count: day.contributionCount });
    });
  });
  cells.sort((a, b) => (a.x + a.y) - (b.x + b.y));

  cells.forEach(cell => {
    let grid_x = cell.x - (weeks.length / 2);
    let grid_y = cell.y - 3;
    let screen_x = (grid_x - grid_y) * tile_w;
    let screen_y = (grid_x + grid_y) * tile_h;
    
    svg += `  <g class="hover-float" style="transform-origin: ${screen_x}px ${screen_y}px;">\n`;
    svg += `    <polygon points="${screen_x},${screen_y} ${screen_x+tile_w},${screen_y+tile_h} ${screen_x},${screen_y+tile_h*2} ${screen_x-tile_w},${screen_y+tile_h}" class="tile-top" />\n`;
    svg += `    <polygon points="${screen_x-tile_w},${screen_y+tile_h} ${screen_x},${screen_y+tile_h*2} ${screen_x},${screen_y+tile_h*2+depth} ${screen_x-tile_w},${screen_y+tile_h+depth}" class="tile-left" />\n`;
    svg += `    <polygon points="${screen_x},${screen_y+tile_h*2} ${screen_x+tile_w},${screen_y+tile_h} ${screen_x+tile_w},${screen_y+tile_h+depth} ${screen_x},${screen_y+tile_h*2+depth}" class="tile-right" />\n`;

    let cx = screen_x, cy = screen_y + tile_h;
    if (cell.count > 0) {
      let delay = (Math.random() * 1.4 + 0.1).toFixed(2);
      svg += `    <g class="grow" style="transform-origin: ${cx}px ${cy}px; animation-delay: ${delay}s;">\n`;
      if (cell.count <= 3) {
        svg += `      <path d="M${cx},${cy} Q${cx-2},${cy-5} ${cx-4},${cy-8}" class="stem" stroke-width="1" fill="none"/>\n`;
        svg += `      <circle cx="${cx-4}" cy="${cy-8}" r="1.5" class="leaf"/>\n`;
      } else if (cell.count <= 6) {
        svg += `      <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy-12}" class="stem" stroke-width="1.5" />\n`;
        svg += `      <polygon points="${cx},${cy-16} ${cx+5},${cy-8} ${cx-5},${cy-8}" class="leaf" />\n`;
      } else if (cell.count <= 10) {
        svg += `      <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy-18}" class="stem" stroke-width="2" />\n`;
        svg += `      <polygon points="${cx},${cy-24} ${cx+6},${cy-12} ${cx-6},${cy-12}" class="leaf" />\n`;
      } else {
        svg += `      <path d="M${cx},${cy} Q${cx-1},${cy-10} ${cx},${cy-20}" class="stem" stroke-width="2.5" fill="none"/>\n`;
        svg += `      <circle cx="${cx}" cy="${cy-22}" r="6" class="leaf"/>\n`;
      }
      svg += `    </g>\n`;
    }
    svg += `  </g>\n`;
  });

  svg += `</g>\n</svg>`;
  return svg;
}

// ۲. تولید گراف دوم (درخت مرکزی با شاخه‌های متغیر)
function generateDynamicTree(collection) {
  const commits = collection.totalCommitContributions || 0;
  const prs = collection.totalPullRequestContributions || 0;
  const reviews = collection.totalPullRequestReviewContributions || 0;
  const issues = collection.totalIssueContributions || 0;

  const total = (commits + prs + reviews + issues) || 1;
  const pCommits = Math.round((commits / total) * 100);
  const pPRs = Math.round((prs / total) * 100);
  const pReviews = Math.round((reviews / total) * 100);
  const pIssues = Math.round((issues / total) * 100);

  // فرمول رشد شاخه‌ها: از حداقل 0.2 (یک ترکه کوچک) تا 1.6 (یک شاخه غول‌پیکر)
  const getScale = (pct) => (0.2 + (pct / 100) * 1.4).toFixed(2);
  const sC = getScale(pCommits);
  const sP = getScale(pPRs);
  const sR = getScale(pReviews);
  const sI = getScale(pIssues);

  let svg = `<svg width="850" height="420" viewBox="0 0 850 420" xmlns="http://www.w3.org/2000/svg">\n`;
  svg += `<style>
    .bg { fill: #0a0a0a; }
    .title { font-family: 'Courier New', monospace; font-size: 15px; fill: #ffffff; letter-spacing: 3px; font-weight: bold; }
    .subtitle { font-family: 'Courier New', monospace; font-size: 10px; fill: #666; letter-spacing: 1.5px; }
    
    .leaf-white { fill: #ffffff; filter: drop-shadow(0px 0px 5px rgba(255,255,255,0.6)); animation: pulse 3s infinite alternate; }
    .leaf-gray { fill: #555555; }
    .leaf-dark { fill: #1a1a1a; stroke: #333; stroke-width: 0.5; }
    
    .pct-val { font-family: 'Courier New', monospace; font-size: 26px; font-weight: bold; fill: #ffffff; }
    .cat-name { font-family: 'Courier New', monospace; font-size: 12px; fill: #bbbbbb; letter-spacing: 2px; font-weight: bold; }
    .cat-count { font-family: 'Courier New', monospace; font-size: 11px; fill: #777777; }
    
    .branch-anim { opacity: 0; animation: growOut 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    
    @keyframes growOut { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
    @keyframes pulse { 0% { filter: drop-shadow(0px 0px 3px rgba(255,255,255,0.4)); } 100% { filter: drop-shadow(0px 0px 10px rgba(255,255,255,1)); } }
  </style>\n`;

  svg += `<rect width="100%" height="100%" class="bg" />\n`;
  svg += `<g transform="translate(40, 45)"><text x="0" y="0" class="title">THE LIVING ACTIVITY TREE</text><text x="0" y="20" class="subtitle">BRANCHES SCALE DYNAMICALLY BY METRIC VOLUME</text></g>\n`;

  // تعریف ساختار یک شاخه پایه (که بعداً تغییر اندازه داده و کپی می‌شود)
  svg += `<defs>
    <g id="master-branch">
        <path d="M 0,0 Q 20,-50 5,-100 T 15,-170" fill="none" stroke="#e0e0e0" stroke-width="7" stroke-linecap="round"/>
        <path d="M 12,-35 Q 35,-50 45,-40" fill="none" stroke="#999" stroke-width="4" stroke-linecap="round"/>
        <path d="M 2,-95 Q -25,-105 -35,-90" fill="none" stroke="#999" stroke-width="3" stroke-linecap="round"/>
        <path d="M 10,-135 Q 30,-140 35,-125" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round"/>
        <!-- برگ‌ها -->
        <circle cx="15" cy="-170" r="22" class="leaf-white"/>
        <circle cx="20" cy="-165" r="16" class="leaf-gray"/>
        <circle cx="5" cy="-158" r="12" class="leaf-dark"/>
        <circle cx="45" cy="-40" r="14" class="leaf-white"/>
        <circle cx="-35" cy="-90" r="12" class="leaf-white"/>
        <circle cx="35" cy="-125" r="10" class="leaf-white"/>
    </g>
  </defs>\n`;

  // تنه اصلی درخت
  svg += `<path d="M 400,420 C 400,350 415,280 425,250 C 435,280 450,350 450,420 Z" fill="#1a1a1a" />\n`;
  svg += `<path d="M 425,250 L 425,420" stroke="#333" stroke-width="1.5" stroke-dasharray="6,4" />\n`; // خط مرکزی تنه

  // ۴ شاخه متصل به تنه که بر اساس دیتا بزرگ/کوچک می‌شوند
  // شاخه Commits (بالا راست)
  svg += `<g class="branch-anim" style="transform-origin: 425px 250px; animation-delay: 0.2s;">
            <use href="#master-branch" transform="translate(425, 250) scale(${sC}, ${sC}) rotate(25)" />
          </g>\n`;
  // شاخه PRs (بالا چپ - معکوس شده)
  svg += `<g class="branch-anim" style="transform-origin: 425px 250px; animation-delay: 0.4s;">
            <use href="#master-branch" transform="translate(425, 250) scale(-${sP}, ${sP}) rotate(25)" />
          </g>\n`;
  // شاخه Reviews (پایین راست)
  svg += `<g class="branch-anim" style="transform-origin: 425px 265px; animation-delay: 0.6s;">
            <use href="#master-branch" transform="translate(425, 265) scale(${sR}, ${sR}) rotate(75)" />
          </g>\n`;
  // شاخه Issues (پایین چپ - معکوس شده)
  svg += `<g class="branch-anim" style="transform-origin: 425px 265px; animation-delay: 0.8s;">
            <use href="#master-branch" transform="translate(425, 265) scale(-${sI}, ${sI}) rotate(75)" />
          </g>\n`;

  // نوشته‌های چهار گوشه تصویر
  // Commits (بالا راست)
  svg += `<text x="810" y="80" class="pct-val" text-anchor="end">${pCommits}%</text>\n`;
  svg += `<text x="810" y="100" class="cat-name" text-anchor="end">COMMITS</text>\n`;
  svg += `<text x="810" y="115" class="cat-count" text-anchor="end">${commits} activities</text>\n`;

  // PRs (بالا چپ)
  svg += `<text x="40" y="110" class="pct-val" text-anchor="start">${pPRs}%</text>\n`;
  svg += `<text x="40" y="130" class="cat-name" text-anchor="start">PULL REQUESTS</text>\n`;
  svg += `<text x="40" y="145" class="cat-count" text-anchor="start">${prs} activities</text>\n`;

  // Reviews (پایین راست)
  svg += `<text x="810" y="320" class="pct-val" text-anchor="end">${pReviews}%</text>\n`;
  svg += `<text x="810" y="340" class="cat-name" text-anchor="end">CODE REVIEWS</text>\n`;
  svg += `<text x="810" y="355" class="cat-count" text-anchor="end">${reviews} activities</text>\n`;

  // Issues (پایین چپ)
  svg += `<text x="40" y="320" class="pct-val" text-anchor="start">${pIssues}%</text>\n`;
  svg += `<text x="40" y="340" class="cat-name" text-anchor="start">ISSUES</text>\n`;
  svg += `<text x="40" y="355" class="cat-count" text-anchor="start">${issues} activities</text>\n`;

  svg += `</svg>`;
  return svg;
}

async function main() {
  try {
    const collection = await fetchData();
    // ساخت تقویم جنگلی سه‌بعدی
    const forestSvg = generateForestCalendar(collection.contributionCalendar.weeks);
    fs.writeFileSync('contributions.svg', forestSvg);
    
    // ساخت گراف درخت فعالیت (بزرگ شدن شاخه‌ها)
    const activitySvg = generateDynamicTree(collection);
    fs.writeFileSync('activity.svg', activitySvg);
    
    console.log('Both SVGs generated successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
