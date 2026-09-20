(() => {
  "use strict";

  const NS = "headerv2";
  const scriptTag = document.currentScript;
  if (!scriptTag) {
    console.error(`[${NS}] script tag not found.`);
    return;
  }

  const headerHTML = `
  <header>
      <a href="https://search3958.github.io/">
        
<svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7 7H19V19L7 14V7Z" fill="url(#paint0_linear_57_48)"/>
<path d="M31 31H19V19L31 24V31Z" fill="url(#paint1_linear_57_48)"/>
<path d="M19 7L31 12V19H19V7Z" fill="url(#paint2_linear_57_48)"/>
<path d="M19 14L31 19H19V14Z" fill="url(#paint3_linear_57_48)"/>
<path d="M19 31L7 26V19H19V31Z" fill="url(#paint4_linear_57_48)"/>
<path d="M19 24L7 19H19V24Z" fill="url(#paint5_linear_57_48)"/>
<defs>
<linearGradient id="paint0_linear_57_48" x1="7" y1="13" x2="19" y2="13" gradientUnits="userSpaceOnUse">
<stop stop-opacity="0.43" style="stop-color:black;stop-opacity:0.43;"/>
<stop offset="1" stop-opacity="0.95" style="stop-color:black;stop-opacity:0.95;"/>
</linearGradient>
<linearGradient id="paint1_linear_57_48" x1="31" y1="25" x2="19" y2="25" gradientUnits="userSpaceOnUse">
<stop stop-opacity="0.43" style="stop-color:black;stop-opacity:0.43;"/>
<stop offset="1" stop-opacity="0.95" style="stop-color:black;stop-opacity:0.95;"/>
</linearGradient>
<linearGradient id="paint2_linear_57_48" x1="19" y1="13" x2="31" y2="13" gradientUnits="userSpaceOnUse">
<stop stop-opacity="0.43" style="stop-color:black;stop-opacity:0.43;"/>
<stop offset="1" stop-opacity="0.95" style="stop-color:black;stop-opacity:0.95;"/>
</linearGradient>
<linearGradient id="paint3_linear_57_48" x1="19" y1="16.5" x2="31" y2="16.5" gradientUnits="userSpaceOnUse">
<stop stop-opacity="0.43" style="stop-color:black;stop-opacity:0.43;"/>
<stop offset="1" stop-opacity="0.95" style="stop-color:black;stop-opacity:0.95;"/>
</linearGradient>
<linearGradient id="paint4_linear_57_48" x1="19" y1="25" x2="7" y2="25" gradientUnits="userSpaceOnUse">
<stop stop-opacity="0.43" style="stop-color:black;stop-opacity:0.43;"/>
<stop offset="1" stop-opacity="0.95" style="stop-color:black;stop-opacity:0.95;"/>
</linearGradient>
<linearGradient id="paint5_linear_57_48" x1="19" y1="21.5" x2="7" y2="21.5" gradientUnits="userSpaceOnUse">
<stop stop-opacity="0.43" style="stop-color:black;stop-opacity:0.43;"/>
<stop offset="1" stop-opacity="0.95" style="stop-color:black;stop-opacity:0.95;"/>
</linearGradient>
</defs>
</svg>
      </a>
      <a href="https://search3958.github.io/i/newtab/">NewTab</a>
      <a href="https://search3958.github.io/i/red/">第一目標</a>
      <a href="https://search3958.github.io/i/tools/">ツール</a>
      <a href="https://search3958.github.io/i/products/">プロダクト</a>
      <a href="https://github.com/search3958/">GitHub</a>
  </header>
  `;

  const footerHTML = `
  <footer>
      <span><a href="https://search3958.github.io/policies/">利用規約と個人情報政策</a>・<a href="https://search3958.github.io/accounts/lang">言語</a>・<a href="https://github.com/search3958/">GitHub</a></span>
<br>

<img width="40" height="40" src="https://search3958.github.io/project/logos/3958logo_main.svg">

  </footer>
  `;

  function insertHeader() {
    const existingHeader = document.querySelector("header");
    if (existingHeader) {
      existingHeader.remove();
    }
    const temp = document.createElement("div");
    temp.innerHTML = headerHTML.trim();
    const headerEl = temp.firstElementChild;
    document.body.insertBefore(headerEl, document.body.firstChild);
    console.info(`[${NS}] header を挿入しました。`);
  }

  function insertFooter() {
    const existingFooter = document.querySelector("footer");
    if (existingFooter) {
      existingFooter.remove();
    }
    const temp = document.createElement("div");
    temp.innerHTML = footerHTML.trim();
    const footerEl = temp.firstElementChild;
    document.body.appendChild(footerEl);
    console.info(`[${NS}] footer を挿入しました。`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      insertHeader();
      insertFooter();
    });
  } else {
    insertHeader();
    insertFooter();
  }
})();
