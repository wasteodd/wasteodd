import fs from 'fs';

const TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = 'wasteodd';

const query = `
  query {
    user(login: "${USERNAME}") {
      contributionsCollection {
        contributionCalendar {
          totalContributions
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

async function fetchContributions() {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query })
  });
  
  const data = await response.json();
  return data.data.user.contributionsCollection.contributionCalendar.weeks;
}

function generateSVG(weeks) {
  let svgContent = `<svg width="850" height="350" viewBox="0 0 850 350" xmlns="http://www.w3.org/2000/svg">\n`;
  svgContent += `<style>
    .bg { fill: #0a0a0a; }
    .tile-top { fill: #1f1f1f; stroke: #333; stroke-width: 0.5; }
    .tile-left { fill: #141414; stroke: #333; stroke-width: 0.5; }
    .tile-right { fill: #0d0d0d; stroke: #333; stroke-width: 0.5; }
    .stem { stroke: #e6e6e6; stroke-linecap: round; stroke-linejoin: round; }
    .leaf { fill: #e6e6e6; }
    .grow {
        transform-origin: bottom center;
        animation: sprout 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        opacity: 0;
    }
    .hover-float { transition: transform 0.3s ease; }
    .hover-float:hover { transform: translateY(-5px); }
    @keyframes sprout {
        0% { transform: scale(0); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
    }
  </style>\n`;
  svgContent += `<rect width="100%" height="100%" class="bg" />\n`;
  svgContent += `<text x="20" y="30" font-family="monospace" font-size="14" fill="#888" letter-spacing="2">CONTRIBUTION FOREST</text>\n`;
  svgContent += `<g transform="translate(425, 80)">\n`;

  const tile_w = 12;
  const tile_h = 6;
  const depth = 4;
  
  let cells = [];
  weeks.forEach((week, w_idx) => {
    week.contributionDays.forEach((day, d_idx) => {
      cells.push({ x: w_idx, y: d_idx, count: day.contributionCount });
    });
  });

  // مرتب‌سازی برای رسم سه‌بعدی از عقب به جلو
  cells.sort((a, b) => (a.x + a.y) - (b.x + b.y));

  cells.forEach(cell => {
    let grid_x = cell.x - (weeks.length / 2);
    let grid_y = cell.y - 3;
    
    let screen_x = (grid_x - grid_y) * tile_w;
    let screen_y = (grid_x + grid_y) * tile_h;
    
    svgContent += `  <g class="hover-float" style="transform-origin: ${screen_x}px ${screen_y}px;">\n`;
    
    // رسم بلوک خاک
    let pts_top = `${screen_x},${screen_y} ${screen_x+tile_w},${screen_y+tile_h} ${screen_x},${screen_y+tile_h*2} ${screen_x-tile_w},${screen_y+tile_h}`;
    svgContent += `    <polygon points="${pts_top}" class="tile-top" />\n`;
    let pts_left = `${screen_x-tile_w},${screen_y+tile_h} ${screen_x},${screen_y+tile_h*2} ${screen_x},${screen_y+tile_h*2+depth} ${screen_x-tile_w},${screen_y+tile_h+depth}`;
    svgContent += `    <polygon points="${pts_left}" class="tile-left" />\n`;
    let pts_right = `${screen_x},${screen_y+tile_h*2} ${screen_x+tile_w},${screen_y+tile_h} ${screen_x+tile_w},${screen_y+tile_h+depth} ${screen_x},${screen_y+tile_h*2+depth}`;
    svgContent += `    <polygon points="${pts_right}" class="tile-right" />\n`;

    let center_x = screen_x;
    let center_y = screen_y + tile_h;
    let count = cell.count;
    
    if (count > 0) {
      let delay = (Math.random() * 1.4 + 0.1).toFixed(2);
      svgContent += `    <g class="grow" style="transform-origin: ${center_x}px ${center_y}px; animation-delay: ${delay}s;">\n`;
      
      if (count <= 3) { // جوانه
        svgContent += `      <path d="M${center_x},${center_y} Q${center_x-2},${center_y-5} ${center_x-4},${center_y-8}" class="stem" stroke-width="1" fill="none"/>\n`;
        svgContent += `      <circle cx="${center_x-4}" cy="${center_y-8}" r="1.5" class="leaf"/>\n`;
        svgContent += `      <path d="M${center_x},${center_y-2} Q${center_x+2},${center_y-4} ${center_x+4},${center_y-6}" class="stem" stroke-width="1" fill="none"/>\n`;
        svgContent += `      <circle cx="${center_x+4}" cy="${center_y-6}" r="1.5" class="leaf"/>\n`;
      } else if (count <= 6) { // درخت کوچک
        svgContent += `      <line x1="${center_x}" y1="${center_y}" x2="${center_x}" y2="${center_y-12}" class="stem" stroke-width="1.5" />\n`;
        svgContent += `      <polygon points="${center_x},${center_y-16} ${center_x+5},${center_y-8} ${center_x-5},${center_y-8}" class="leaf" />\n`;
        svgContent += `      <polygon points="${center_x},${center_y-12} ${center_x+4},${center_y-5} ${center_x-4},${center_y-5}" class="leaf" />\n`;
      } else if (count <= 10) { // کاج متوسط
        svgContent += `      <line x1="${center_x}" y1="${center_y}" x2="${center_x}" y2="${center_y-18}" class="stem" stroke-width="2" />\n`;
        svgContent += `      <polygon points="${center_x},${center_y-24} ${center_x+6},${center_y-12} ${center_x-6},${center_y-12}" class="leaf" />\n`;
        svgContent += `      <polygon points="${center_x},${center_y-18} ${center_x+7},${center_y-7} ${center_x-7},${center_y-7}" class="leaf" />\n`;
        svgContent += `      <polygon points="${center_x},${center_y-12} ${center_x+8},${center_y-2} ${center_x-8},${center_y-2}" class="leaf" />\n`;
      } else { // درخت بزرگ
        svgContent += `      <path d="M${center_x},${center_y} Q${center_x-1},${center_y-10} ${center_x},${center_y-20}" class="stem" stroke-width="2.5" fill="none"/>\n`;
        svgContent += `      <path d="M${center_x},${center_y-10} Q${center_x-5},${center_y-15} ${center_x-8},${center_y-18}" class="stem" stroke-width="1.5" fill="none"/>\n`;
        svgContent += `      <path d="M${center_x},${center_y-14} Q${center_x+5},${center_y-18} ${center_x+8},${center_y-22}" class="stem" stroke-width="1.5" fill="none"/>\n`;
        svgContent += `      <circle cx="${center_x}" cy="${center_y-22}" r="6" class="leaf"/>\n`;
        svgContent += `      <circle cx="${center_x-6}" cy="${center_y-18}" r="5" class="leaf"/>\n`;
        svgContent += `      <circle cx="${center_x+6}" cy="${center_y-20}" r="5" class="leaf"/>\n`;
        svgContent += `      <circle cx="${center_x-3}" cy="${center_y-25}" r="4" class="leaf"/>\n`;
        svgContent += `      <circle cx="${center_x+4}" cy="${center_y-24}" r="4" class="leaf"/>\n`;
      }
      svgContent += `    </g>\n`;
    }
    svgContent += `  </g>\n`;
  });

  svgContent += `</g>\n</svg>`;
  return svgContent;
}

async function main() {
  try {
    const weeks = await fetchContributions();
    const svg = generateSVG(weeks);
    fs.writeFileSync('contributions.svg', svg);
    console.log('SVG Generated Successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
