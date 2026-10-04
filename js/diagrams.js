/* Theme-aware Mermaid rendering: keeps each diagram's source and re-renders
   with matching colors whenever the page theme changes. */
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
      clusterBkg: '#f4f6f5', clusterBorder: '#b5c4bf', edgeLabelBackground: '#ffffff'
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
      clusterBkg: '#172024', clusterBorder: '#3d5056', edgeLabelBackground: '#172024'
    }
  }
};

async function render() {
  if (!nodes.length) return;
  const mode = (window.fateTheme && window.fateTheme()) === 'dark' ? 'dark' : 'light';
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', ...THEMES[mode] });
  nodes.forEach((n) => { n.removeAttribute('data-processed'); n.textContent = n.dataset.src; });
  try { await mermaid.run({ nodes }); } catch (e) { console.warn('Mermaid render failed:', e); }
}

render();
document.addEventListener('themechange', render);
