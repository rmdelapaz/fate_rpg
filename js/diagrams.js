/* Theme-aware Mermaid rendering: keeps each diagram's source and re-renders
   with matching colors whenever the page theme changes. Wide diagrams are
   never shrunk below a readable size; they scroll sideways instead. */
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';

const nodes = [...document.querySelectorAll('.mermaid')];
// Read each diagram's source; a literal <br/> in the HTML becomes an element,
// so turn those back into Mermaid line breaks before taking the text.
nodes.forEach((n) => {
  const copy = n.cloneNode(true);
  copy.querySelectorAll('br').forEach((br) => br.replaceWith('<br/>'));
  n.dataset.src = copy.textContent;
});

const THEMES = {
  light: {
    theme: 'base',
    themeVariables: {
      fontFamily: '"Source Sans 3", "Segoe UI", system-ui, sans-serif',
      primaryColor: '#e2f2ef', primaryTextColor: '#122320', primaryBorderColor: '#0b6b64',
      secondaryColor: '#fcecd9', tertiaryColor: '#eaf0ee',
      lineColor: '#55635f', textColor: '#122320', mainBkg: '#e2f2ef', nodeBorder: '#0b6b64',
      clusterBkg: '#f4f6f5', clusterBorder: '#b5c4bf', edgeLabelBackground: '#ffffff',
      pieTitleTextColor: '#122320', pieLegendTextColor: '#122320', pieSectionTextColor: '#ffffff',
      pie1: '#0b6b64', pie2: '#b4570b', pie3: '#1f5fa8', pie4: '#7b3fb0', pie5: '#1f7a3d', pie6: '#b42318'
    }
  },
  dark: {
    theme: 'base',
    themeVariables: {
      darkMode: true,
      fontFamily: '"Source Sans 3", "Segoe UI", system-ui, sans-serif',
      primaryColor: '#173c3a', primaryTextColor: '#eefaf8', primaryBorderColor: '#6fd8cb',
      secondaryColor: '#3a2a18', tertiaryColor: '#1e292e',
      lineColor: '#9fb1ad', textColor: '#eefaf8', mainBkg: '#173c3a', nodeBorder: '#6fd8cb',
      clusterBkg: '#172024', clusterBorder: '#3d5056', edgeLabelBackground: '#172024',
      pieTitleTextColor: '#eefaf8', pieLegendTextColor: '#eefaf8', pieSectionTextColor: '#ffffff',
      pieStrokeColor: '#172024',
      pie1: '#0b6b64', pie2: '#a14c06', pie3: '#1f5fa8', pie4: '#7b3fb0', pie5: '#1f7a3d', pie6: '#b42318'
    }
  }
};

const MIN_SCALE = 0.8;          // ~13px text for Mermaid's 16px labels
const NARROW = 700;             // below this, left-to-right flowcharts render top-to-bottom

function sourceFor(n) {
  let src = n.dataset.src;
  if (window.innerWidth < NARROW) {
    src = src.replace(/^(\s*(?:graph|flowchart))\s+(LR|RL)\b/m, '$1 TD');
  }
  return src;
}

function fit(n) {
  const svg = n.querySelector('svg');
  const hint = n.previousElementSibling && n.previousElementSibling.classList.contains('diagram-hint')
    ? n.previousElementSibling : null;
  if (!svg) return;
  const vb = svg.viewBox && svg.viewBox.baseVal;
  const natural = vb && vb.width ? vb.width : svg.getBoundingClientRect().width;
  const cs = getComputedStyle(n);
  const avail = n.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  // Slightly-too-wide diagrams just shrink a little; only really wide ones scroll.
  const wide = avail / natural < MIN_SCALE - 0.1;
  if (wide) {
    svg.style.maxWidth = 'none';
    svg.style.width = Math.round(natural * MIN_SCALE) + 'px';
    svg.removeAttribute('width');
    n.classList.add('is-wide');
    if (!hint) {
      const p = document.createElement('p');
      p.className = 'diagram-hint';
      p.textContent = '↔ This diagram is wide — scroll sideways to see all of it.';
      n.before(p);
    }
  } else {
    n.classList.remove('is-wide');
    if (hint) hint.remove();
  }
}

const vbWidth = (svgText) => {
  const m = svgText.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) /);
  return m ? parseFloat(m[1]) : Infinity;
};

// A wide flowchart may fit better in the other direction
// (a broad top-down fan-out reads better left-to-right, and vice versa).
let altId = 0;
async function tryOtherDirection(n) {
  if (!n.classList.contains('is-wide')) return;
  const src = sourceFor(n);
  const m = src.match(/^(\s*(?:graph|flowchart))\s+(TD|TB|LR|RL|BT)\b/m);
  if (!m) return;
  const other = /^(LR|RL)$/.test(m[2]) ? 'TD' : 'LR';
  const alt = src.replace(m[0], `${m[1]} ${other}`);
  try {
    const { svg } = await mermaid.render(`alt-diagram-${altId++}`, alt);
    const svgEl = n.querySelector('svg');
    const current = svgEl && svgEl.viewBox ? svgEl.viewBox.baseVal.width : Infinity;
    if (vbWidth(svg) < current * 0.8) { n.innerHTML = svg; fit(n); }
  } catch (e) { /* keep the original rendering */ }
}

let rendering = Promise.resolve();
function render() {
  rendering = rendering.then(async () => {
    if (!nodes.length) return;
    const mode = (window.fateTheme && window.fateTheme()) === 'dark' ? 'dark' : 'light';
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', ...THEMES[mode] });
    nodes.forEach((n) => { n.removeAttribute('data-processed'); n.textContent = sourceFor(n); });
    try { await mermaid.run({ nodes }); } catch (e) { console.warn('Mermaid render failed:', e); }
    nodes.forEach(fit);
    for (const n of nodes) await tryOtherDirection(n);
  });
  return rendering;
}

render();
document.addEventListener('themechange', render);

// Re-fit on resize; re-render only when crossing the narrow breakpoint (diagram direction changes).
let wasNarrow = window.innerWidth < NARROW, t;
window.addEventListener('resize', () => {
  clearTimeout(t);
  t = setTimeout(() => {
    const isNarrow = window.innerWidth < NARROW;
    if (isNarrow !== wasNarrow) { wasNarrow = isNarrow; render(); }
    else nodes.forEach(fit);
  }, 150);
});
