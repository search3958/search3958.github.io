const fs = require('fs');
const path = require('path');

const xmlDir = '/Users/cheontaerang/Documents/GitHub/search3958.github.io/xml';

const navKeys = {
  nav_home: { ja: 'ホーム', en: 'Home', 'zh-CN': '首页', 'zh-TW': '首頁', ko: '홈', 'ko-KP': '홈' },
  nav_newtab: { ja: 'NewTab', en: 'NewTab', 'zh-CN': 'NewTab', 'zh-TW': 'NewTab', ko: 'NewTab', 'ko-KP': 'NewTab' },
  nav_red: { ja: '第一目標', en: 'Primary Goals', 'zh-CN': '首要目标', 'zh-TW': '首要目標', ko: '주요 목표', 'ko-KP': '주요 목표' },
  nav_tools: { ja: 'ツール', en: 'Tools', 'zh-CN': '工具', 'zh-TW': '工具', ko: '도구', 'ko-KP': '도구' },
  nav_products: { ja: 'プロダクト', en: 'Products', 'zh-CN': '产品', 'zh-TW': '產品', ko: '제품', 'ko-KP': '제품들' },
  nav_github: { ja: 'GitHub', en: 'GitHub', 'zh-CN': 'GitHub', 'zh-TW': 'GitHub', ko: 'GitHub', 'ko-KP': 'GitHub' }
};

const files = fs.readdirSync(xmlDir).filter(f => f.endsWith('.xml'));

for (const file of files) {
  const filePath = path.join(xmlDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if nav keys already exist
  if (content.includes('nav_')) continue;
  
  // For each language block, add nav keys before </lang>
  const langIds = Object.keys(navKeys['nav_home']);
  
  for (const langId of langIds) {
    const langBlockStart = content.indexOf(`<lang id="${langId}">`);
    if (langBlockStart === -1) continue;
    
    const langBlockEnd = content.indexOf('</lang>', langBlockStart);
    if (langBlockEnd === -1) continue;
    
    // Find the last text element in this language block
    const lastTextMatch = content.slice(langBlockStart, langBlockEnd).match(/<text key="[^"]+"[^>]*>[\s\S]*?<\/text>\s*$/);
    
    if (lastTextMatch) {
      const lastTextEnd = langBlockStart + lastTextMatch.index + lastTextMatch[0].length;
      const beforeLangEnd = content.slice(0, lastTextEnd);
      const afterLangEnd = content.slice(lastTextEnd);
      
      // Build nav entries for this language
      const navEntries = Object.entries(navKeys)
        .map(([key, translations]) => `        <text key="${key}">${translations[langId]}</text>`)
        .join('\n');
      
      content = beforeLangEnd + '\n' + navEntries + '\n    ' + afterLangEnd;
    }
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Added nav keys to ${file}`);
}

console.log('Done!');
