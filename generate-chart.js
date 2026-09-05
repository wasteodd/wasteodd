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
  let svgContent = `<svg width="850" height="150" viewBox="0 0 850 150" xmlns="http://www.w3.org/2000/svg">\n`;
  svgContent += `<style>
    .bg { fill: #f4f4f4; stroke: #e0e0e0; stroke-width: 1px; }
    .l1 { fill: #a6a6a6; }
    .l2 { fill: #595959; }
    .l3 { fill: #262626; }
    .l4 { fill: #000000; }
  </style>\n<g transform="translate(20, 20)">\n`;

  let x = 0;
  weeks.forEach(week => {
    let y = 0;
    week.contributionDays.forEach(day => {
      const count = day.contributionCount;
      // تعیین کلاس رنگی بر اساس تعداد کامیت
      let colorClass = 'bg';
      if (count > 0 && count <= 3) colorClass = 'l1';
      else if (count > 3 && count <= 6) colorClass = 'l2';
      else if (count > 6 && count <= 10) colorClass = 'l3';
      else if (count > 10) colorClass = 'l4';

      svgContent += `  <circle cx="${x}" cy="${y}" r="6" class="${colorClass}" />\n`;
      y += 16; // فاصله عمودی بین دایره‌ها
    });
    x += 16; // فاصله افقی بین ستون‌ها
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
