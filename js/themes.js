export const THEMES_DATA = [
  {
    id:'crimson', name:'Crimson', desc:'Rosso fuoco — default',
    accent:'#e63946', accentRgb:'230,57,70',
    bg:'#080808',
    bgGradient:'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(230,57,70,0.28) 0%, transparent 65%)',
    headerBg:'linear-gradient(180deg, rgba(230,57,70,0.14) 0%, transparent 100%)',
    preview:['#080808','#e63946','#141414'],
    cardBg:'linear-gradient(145deg,#161212,#111)',
    cardBorder:'rgba(230,57,70,0.22)',
    cardShadow:'0 4px 28px rgba(230,57,70,0.08)'
  },
  {
    id:'ocean', name:'Ocean', desc:'Blu notte profondo',
    accent:'#4cc9f0', accentRgb:'76,201,240',
    bg:'#060a12',
    bgGradient:'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(76,201,240,0.22) 0%, transparent 65%)',
    headerBg:'linear-gradient(180deg, rgba(76,201,240,0.12) 0%, transparent 100%)',
    preview:['#060a12','#4cc9f0','#0d1220'],
    cardBg:'linear-gradient(145deg,#0d1525,#0a0e18)',
    cardBorder:'rgba(76,201,240,0.22)',
    cardShadow:'0 4px 28px rgba(76,201,240,0.08)'
  },
  {
    id:'forest', name:'Forest', desc:'Verde scuro naturale',
    accent:'#2ecc71', accentRgb:'46,204,113',
    bg:'#060c08',
    bgGradient:'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(46,204,113,0.22) 0%, transparent 65%)',
    headerBg:'linear-gradient(180deg, rgba(46,204,113,0.12) 0%, transparent 100%)',
    preview:['#060c08','#2ecc71','#0d150f'],
    cardBg:'linear-gradient(145deg,#0d1810,#0a120c)',
    cardBorder:'rgba(46,204,113,0.22)',
    cardShadow:'0 4px 28px rgba(46,204,113,0.08)'
  },
  {
    id:'galaxy', name:'Galaxy', desc:'Viola cosmico',
    accent:'#9b59b6', accentRgb:'155,89,182',
    bg:'#08060c',
    bgGradient:'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(155,89,182,0.26) 0%, transparent 65%)',
    headerBg:'linear-gradient(180deg, rgba(155,89,182,0.15) 0%, transparent 100%)',
    preview:['#08060c','#9b59b6','#110d18'],
    cardBg:'linear-gradient(145deg,#130d1a,#0e0a14)',
    cardBorder:'rgba(155,89,182,0.22)',
    cardShadow:'0 4px 28px rgba(155,89,182,0.09)'
  },
  {
    id:'gold', name:'Gold', desc:'Oro elegante',
    accent:'#f1c40f', accentRgb:'241,196,15',
    bg:'#0c0b06',
    bgGradient:'radial-gradient(ellipse 90% 55% at 50% -5%, rgba(241,196,15,0.2) 0%, transparent 65%)',
    headerBg:'linear-gradient(180deg, rgba(241,196,15,0.1) 0%, transparent 100%)',
    preview:['#0c0b06','#f1c40f','#151300'],
    cardBg:'linear-gradient(145deg,#181500,#110f00)',
    cardBorder:'rgba(241,196,15,0.22)',
    cardShadow:'0 4px 28px rgba(241,196,15,0.07)'
  },
];

export function applyTheme(theme) {
  document.documentElement.style.setProperty('--accent',      theme.accent);
  document.documentElement.style.setProperty('--accent-rgb',  theme.accentRgb);
  document.documentElement.style.setProperty('--bg',          theme.bg);
  document.documentElement.style.setProperty('--bg-gradient', theme.bgGradient);
  document.documentElement.style.setProperty('--header-bg',   theme.headerBg   || 'transparent');
  document.documentElement.style.setProperty('--card-bg',     theme.cardBg     || 'linear-gradient(145deg,#141414,#111)');
  document.documentElement.style.setProperty('--card-border', theme.cardBorder || 'rgba(255,255,255,0.06)');
  document.documentElement.style.setProperty('--card-shadow', theme.cardShadow || '0 4px 24px rgba(0,0,0,0.4)');
  document.body.style.backgroundColor = theme.bg;
  document.body.style.backgroundImage = theme.bgGradient;
  localStorage.setItem('gymAccentColor', theme.accent);
  localStorage.setItem('gymAccentRgb',   theme.accentRgb);
}

export function applyAccentColor(color, rgb) {
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-rgb', rgb);
}
