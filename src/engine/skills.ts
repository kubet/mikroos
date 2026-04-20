// Skills: knowledge docs the agent can search and read.
// Agent searches → finds skill → opens it → follows instructions.

export interface Skill {
  name: string;
  description: string;
  content: string;
}

export const skills: Skill[] = [
  {
    name: "react",
    description: "React app with hooks, CDN-based",
    content: `# React App (CDN, needs internet)

## index.html
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="root"></div>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="text/babel" src="app.jsx"></script>
</body>
</html>
\`\`\`

## app.jsx
\`\`\`jsx
const { useState } = React;
function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="app">
      <h1>React App</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
\`\`\`

## style.css
\`\`\`css
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;padding:2rem;background:#111;color:#eee}
.app{max-width:400px;margin:0 auto;text-align:center}
h1{margin-bottom:1rem}
p{font-size:2rem;margin:1rem 0}
button{padding:.5rem 1.5rem;margin:.25rem;border:1px solid #555;background:#222;color:#eee;border-radius:4px;cursor:pointer}
button:hover{background:#333}
\`\`\`

Write each file. preview index.html.`,
  },
  {
    name: "vue",
    description: "Vue 3 app, CDN-based",
    content: `# Vue App (CDN, needs internet)

## index.html — single file, includes everything
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vue App</title>
  <script src="https://unpkg.com/vue@3"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;padding:2rem;background:#111;color:#eee}
    #app{max-width:400px;margin:0 auto;text-align:center}
    h1{margin-bottom:1rem}
    button,input{padding:.5rem 1rem;margin:.25rem;border:1px solid #555;background:#222;color:#eee;border-radius:4px}
    hr{margin:1rem 0;border-color:#333}
  </style>
</head>
<body>
  <div id="app">
    <h1>Vue App</h1>
    <p>Count: {{ count }}</p>
    <button @click="count++">+1</button>
    <button @click="count = 0">Reset</button>
    <hr>
    <input v-model="msg" placeholder="type here">
    <p>{{ msg }}</p>
  </div>
  <script>
    Vue.createApp({ data() { return { count: 0, msg: '' } } }).mount('#app')
  </script>
</body>
</html>
\`\`\`

Write index.html. preview it.`,
  },
  {
    name: "site",
    description: "Static HTML + CSS + JS website, fully offline, no CDN",
    content: `# Static Site (offline, no CDN needed)

## index.html — all-in-one, works offline
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Site</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#111;color:#eee;line-height:1.6}
    header,main,footer{max-width:600px;margin:0 auto;padding:2rem}
    header{text-align:center;border-bottom:1px solid #333}
    h1{font-size:2rem}h2{margin:1.5rem 0 .5rem}
    ul{padding-left:1.5rem}
    footer{text-align:center;color:#666;border-top:1px solid #333}
    a{color:#7af}
  </style>
</head>
<body>
  <header><h1>My Site</h1><p>A simple website</p></header>
  <main>
    <section><h2>About</h2><p>Built with MikroOS. No dependencies.</p></section>
    <section><h2>Features</h2><ul><li>Fast</li><li>Offline</li><li>Zero dependencies</li></ul></section>
  </main>
  <footer>Built with MikroOS</footer>
  <script>console.log('loaded');</script>
</body>
</html>
\`\`\`

Write index.html. preview it. Customize content based on user request.`,
  },
  {
    name: "presentation",
    description: "HTML slide presentation, offline, keyboard navigation",
    content: `# Presentation (offline, no CDN needed)

Steps:
1. If about a person/topic you don't know: search(name) to find info first
2. Then write the presentation HTML

## presentation.html — self-contained slide deck
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presentation</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#eee;overflow:hidden;height:100vh}
    .slide{display:none;flex-direction:column;justify-content:center;align-items:center;height:100vh;padding:4rem;text-align:center}
    .slide.active{display:flex}
    h1{font-size:3rem;margin-bottom:1rem}
    h2{font-size:2rem;margin-bottom:1rem;color:#aaa}
    p,li{font-size:1.3rem;line-height:1.8;color:#ccc}
    ul{text-align:left;list-style:none}
    ul li::before{content:"→ ";color:#555}
    .nav{position:fixed;bottom:2rem;right:2rem;color:#444;font-size:.9rem}
    .title-slide h1{font-size:4rem}
    .title-slide h2{font-size:1.5rem;color:#666}
  </style>
</head>
<body>
  <div class="slide active title-slide">
    <h1>TITLE</h1>
    <h2>SUBTITLE</h2>
  </div>
  <div class="slide">
    <h2>Section 1</h2>
    <ul><li>Point one</li><li>Point two</li><li>Point three</li></ul>
  </div>
  <div class="slide">
    <h2>Section 2</h2>
    <p>Details go here.</p>
  </div>
  <div class="slide">
    <h1>Thank You</h1>
  </div>
  <div class="nav">← → to navigate</div>
  <script>
    let c=0;const s=document.querySelectorAll('.slide');
    function go(d){s[c].classList.remove('active');c=Math.max(0,Math.min(s.length-1,c+d));s[c].classList.add('active')}
    document.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key===' ')go(1);if(e.key==='ArrowLeft')go(-1)});
    document.addEventListener('click',e=>{e.clientX>window.innerWidth/2?go(1):go(-1)});
  </script>
</body>
</html>
\`\`\`

IMPORTANT: Replace TITLE, SUBTITLE, and slide content with real info about the topic.
If making a presentation about a person, first search(name) to get real facts.
Add 4-8 slides. Keep text short — bullet points, not paragraphs.
Write presentation.html. preview it.`,
  },
  {
    name: "api",
    description: "Node.js REST API (needs lifo install node)",
    content: `# REST API

First: bash("lifo install node")

## server.js
\`\`\`js
const http = require('http');
const todos = [];
let nextId = 1;
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET' && req.url === '/todos') res.end(JSON.stringify(todos));
  else if (req.method === 'POST' && req.url === '/todos') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const todo = { id: nextId++, text: JSON.parse(body).text, done: false };
      todos.push(todo);
      res.statusCode = 201;
      res.end(JSON.stringify(todo));
    });
  } else { res.statusCode = 404; res.end('{"error":"not found"}'); }
});
server.listen(3000, () => console.log('API on :3000'));
\`\`\`

Write server.js. Run: bash("node server.js")`,
  },
  {
    name: "script",
    description: "Shell script template",
    content: `# Shell Script

## script.sh
\`\`\`sh
#!/bin/sh
echo "=== System Info ==="
uname -a
echo ""
echo "=== Workspace ==="
pwd && ls -la
echo ""
echo "Done."
\`\`\`

Write script.sh. Run: bash("sh /workspace/script.sh")`,
  },
];

// Search skills. Matches ANY word against name, description, content.
export function searchSkills(query: string): Skill[] {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  return skills.filter((s) => {
    const hay = `${s.name} ${s.description} ${s.content}`.toLowerCase();
    return words.some((w) => hay.includes(w));
  });
}

export function getSkill(name: string): Skill | undefined {
  return skills.find((s) => s.name === name.toLowerCase());
}

export function skillsList(): string {
  return skills.map((s) => `${s.name} - ${s.description}`).join("\n");
}
