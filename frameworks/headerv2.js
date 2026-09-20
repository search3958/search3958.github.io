(() => {
"use strict";

const NS = "headerv2";

const scriptTag = document.currentScript;

if (!scriptTag) {
console.error(`[${NS}] script tag not found.`);
return;
}

const STYLE_ID = "headerv2-style";
const MENU_ID = "headerv2-menu";
const BACKDROP_ID = "headerv2-backdrop";

const I18N = {
ja: {
header: {
products: "プロダクト",
newtab: "Newtab",
firstGoal: "第一目標",
support: "サポートと情報"
},
footer: {
policies: "利用規約と個人情報政策",
language: "言語",
github: "GitHub",
notice: "信頼されるサービスを目指しておりますが、高校生ゆえ不手際があるかもしれません\nその際はお問い合わせフォームよりご指摘いただけますと幸いです"
},
menus: {
newtab: {
title: "Newtab",
items: [
"Newtabについて知る",
"設定方法",
"今すぐ試す"
]
},
products: {
title: "プロダクト",
items: [
"プロダクト一覧",
"ツール",
"BaramOS",
"私のGoogle Play"
]
},
support: {
title: "サポートと情報",
items: [
"サポート",
"私のGitHub",
"問い合わせ",
"利用規約および個人情報政策",
"Language"
]
}
}
},

en: {
header: {
products: "Products",
newtab: "Newtab",
firstGoal: "First Goal",
support: "Support & Info"
},
footer: {
policies: "Terms & Privacy Policy",
language: "Language",
github: "GitHub",
notice: "We aim to provide a service you can trust, but as a high school student, I may make mistakes or oversights.\nIf you notice any issues, I would appreciate it if you could let me know through the contact form."
},
menus: {
newtab: {
title: "Newtab",
items: [
"About Newtab",
"Setup Guide",
"Try It Now"
]
},
products: {
title: "Products",
items: [
"All Products",
"Tools",
"BaramOS",
"My Google Play"
]
},
support: {
title: "Support & Info",
items: [
"Support",
"My GitHub",
"Contact",
"Terms & Privacy Policy",
"Language"
]
}
}
},

ko: {
header: {
products: "프로덕트",
newtab: "Newtab",
firstGoal: "첫 목표",
support: "지원 및 정보"
},
footer: {
policies: "이용약관 및 개인정보 정책",
language: "언어",
github: "GitHub",
notice: "신뢰받는 서비스를 만들기 위해 노력하고 있지만, 고등학생인 만큼 미흡한 점이 있을 수 있습니다.\n그러한 경우 문의 양식을 통해 지적해 주시면 감사하겠습니다."
},
menus: {
newtab: {
title: "Newtab",
items: [
"Newtab 알아보기",
"설정 방법",
"지금 사용해 보기"
]
},
products: {
title: "프로덕트",
items: [
"프로덕트 목록",
"도구",
"BaramOS",
"내 Google Play"
]
},
support: {
title: "지원 및 정보",
items: [
"지원",
"봉사자용 원시 프로그람",
"문의",
"이용약관 및 개인정보 정책",
"언어"
]
}
}
},

"ko-kp": {
header: {
products: "제품",
newtab: "앞길7",
firstGoal: "우리 정젝사상",
support: "지원과 정보"
},
footer: {
policies: "리용약관과 개인정보정책",
language: "언어",
github: "봉사자용 원시 프로그람",
notice: "신뢰받는 봉사를 지향하지만 고등학생이기에 미흡한 점이 있을수 있습니다.\n그러한 경우 문의양식을 통해 지적해주시면 고맙겠습니다."
},
menus: {
newtab: {
title: "앞길",
items: [
"앞길7에 대하여",
"설정방법",
"지금 써보기"
]
},
products: {
title: "제품",
items: [
"제품목록",
"도구",
"바람조작체계",
"나의 길 동무 페지 (Google)"
]
},
support: {
title: "지원과 정보",
items: [
"지원",
"내 GitHub",
"문의",
"리용약관 및 개인정보정책",
"언어"
]
}
}
},

zh: {
header: {
products: "产品",
newtab: "Newtab",
firstGoal: "第一目标",
support: "支持与信息"
},
footer: {
policies: "使用条款和隐私政策",
language: "语言",
github: "GitHub",
notice: "我们致力于成为值得信赖的服务，但由于我还是一名高中生，可能会有做得不够周全的地方。\n如有不周之处，敬请通过联系表单指出，非常感谢。"
},
menus: {
newtab: {
title: "Newtab",
items: [
"了解 Newtab",
"设置方法",
"立即试用"
]
},
products: {
title: "产品",
items: [
"产品列表",
"工具",
"BaramOS",
"我的 Google Play"
]
},
support: {
title: "支持与信息",
items: [
"支持",
"我的 GitHub",
"联系我",
"使用条款和隐私政策",
"语言"
]
}
}
},

"zh-tw": {
header: {
products: "產品",
newtab: "Newtab",
firstGoal: "第一目標",
support: "支援與資訊"
},
footer: {
policies: "使用條款與隱私權政策",
language: "語言",
github: "GitHub",
notice: "我們致力於成為值得信賴的服務，但由於我還是一名高中生，可能會有做得不夠周全的地方。\n如有不周之處，敬請透過聯絡表單指正，十分感謝。"
},
menus: {
newtab: {
title: "Newtab",
items: [
"了解 Newtab",
"設定方法",
"立即試用"
]
},
products: {
title: "產品",
items: [
"產品列表",
"工具",
"BaramOS",
"我的 Google Play"
]
},
support: {
title: "支援與資訊",
items: [
"支援",
"我的 GitHub",
"聯絡我",
"使用條款與隱私權政策",
"語言"
]
}
}
},

ru: {
header: {
products: "Продукты",
newtab: "Newtab",
firstGoal: "Первая цель",
support: "Поддержка и информация"
},
footer: {
policies: "Условия использования и политика конфиденциальности",
language: "Язык",
github: "GitHub",
notice: "Мы стремимся предоставлять сервис, которому можно доверять, но, поскольку я ещё учусь в старшей школе, я могу допустить недочёты.\nЕсли вы заметите что-либо подобное, буду благодарен, если сообщите об этом через форму обратной связи."
},
menus: {
newtab: {
title: "Newtab",
items: [
"О Newtab",
"Как настроить",
"Попробовать сейчас"
]
},
products: {
title: "Продукты",
items: [
"Все продукты",
"Инструменты",
"BaramOS",
"Мой Google Play"
]
},
support: {
title: "Поддержка и информация",
items: [
"Поддержка",
"Мой GitHub",
"Связаться",
"Условия и политика конфиденциальности",
"Язык"
]
}
}
}
};

function getSelectedLang() {
let rawLang = "ja";

try {
rawLang =
window.localStorage.getItem("selectedLang") || "ja";
} catch (error) {
console.error(
`[${NS}] failed to read selectedLang from localStorage.`,
error
);
return "ja";
}

if (typeof rawLang !== "string") {
console.error(
`[${NS}] selectedLang is not a string.`,
rawLang
);
return "ja";
}

const normalizedLang =
rawLang
.trim()
.toLowerCase()
.replace(/_/g, "-");

if (I18N[normalizedLang]) {
return normalizedLang;
}

if (normalizedLang.startsWith("ko-kp")) {
return "ko-kp";
}

if (normalizedLang.startsWith("ko")) {
return "ko";
}

if (
normalizedLang.startsWith("zh-tw") ||
normalizedLang.startsWith("zh-hant")
) {
return "zh-tw";
}

if (normalizedLang.startsWith("zh")) {
return "zh";
}

if (normalizedLang.startsWith("en")) {
return "en";
}

if (normalizedLang.startsWith("ru")) {
return "ru";
}

console.info(
`[${NS}] unsupported selectedLang, falling back to ja: ${rawLang}`
);

return "ja";
}

function getI18n() {
const lang = getSelectedLang();
const dictionary = I18N[lang];

if (!dictionary) {
console.error(
`[${NS}] translation dictionary not found: ${lang}`
);
return I18N.ja;
}

return dictionary;
}

const headerHTML = `
<header style="z-index:999999!important">
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

<a
href="https://search3958.github.io/i/products/"
data-headerv2-menu="products"
>
<span data-headerv2-i18n="header.products">プロダクト</span>
</a>

<a
href="https://search3958.github.io/i/newtab/"
data-headerv2-menu="newtab"
>
<span data-headerv2-i18n="header.newtab">Newtab</span>
</a>

<a href="https://search3958.github.io/i/red/">
<span data-headerv2-i18n="header.firstGoal">第一目標</span>
</a>

<a
href="javascript:void(0)"
data-headerv2-menu="support"
data-headerv2-no-navigation="true"
>
<span data-headerv2-i18n="header.support">サポートと情報</span>
</a>
</header>
`;

const footerHTML = `
<footer>
<span><a href="https://search3958.github.io/policies/"><span data-headerv2-i18n="footer.policies">利用規約と個人情報政策</span></a>・<a href="https://search3958.github.io/accounts/lang"><span data-headerv2-i18n="footer.language">言語</span></a>・<a href="https://github.com/search3958/"><span data-headerv2-i18n="footer.github">GitHub</span></a></span>
<br>

<img width="40" height="60" src="https://search3958.github.io/project/logos/3958logo_main.svg">

<div
class="headerv2-footer-note"
data-headerv2-i18n="footer.notice"
>
信頼されるサービスを目指しておりますが、高校生ゆえ不手際があるかもしれません
その際はお問い合わせフォームよりご指摘いただけますと幸いです
</div>

</footer>
`;

const menuData = {
newtab: {
titleKey: "newtab",
items: [
{
href:
"https://search3958.github.io/i/newtab/"
},
{
href:
"https://search3958.github.io/support/docs/ja/newtab_setup.html"
},
{
href:
"https://search3958.github.io/newtab/?value=head-try"
}
]
},

products: {
titleKey: "products",
items: [
{
href:
"https://search3958.github.io/i/products/"
},
{
href:
"https://search3958.github.io/i/tools/"
},
{
href:
"https://search3958.github.io/i/baram-os/"
},
{
href:
"https://play.google.com/store/apps/dev?id=5714216887541621486"
}
]
},

support: {
titleKey: "support",
items: [
{
href:
"https://search3958.github.io/support/"
},
{
href:
"https://github.com/search3958/"
},
{
href:
"https://docs.google.com/forms/d/e/1FAIpQLSegCKF2UdLdEA7cQ6y3PS3vlZ8fT29KnEyo26RDl15ocIM1Ig/viewform"
},
{
href:
"https://search3958.github.io/policies/"
},
{
href:
"https://search3958.github.io/accounts/lang"
}
]
}
};

function injectStyle() {
if (!document.head) {
console.error(
`[${NS}] document.head not found.`
);
return false;
}

const oldStyle =
document.getElementById(STYLE_ID);

if (oldStyle) {
oldStyle.remove();

console.info(
`[${NS}] old style removed.`
);
}

const style =
document.createElement("style");

if (!style) {
console.error(
`[${NS}] failed to create style element.`
);
return false;
}

style.id =
STYLE_ID;

style.textContent = `

header {
position: fixed;
background: #fffb;
color: #000;
top: -1px;
left: 0;
width: 100vw;
display: flex;
justify-content: center;
align-items: center;
backdrop-filter: blur(16px);
padding: 0px;
font-size: 13px;
height: 52px;
}

header > a {
text-decoration: none;
color:#000;
padding: 20px 12px;
}

header > a > svg {
padding-top: 4px;
}

footer .headerv2-footer-note {
margin-top: 8px;
font-size: 14px;
line-height: 1.6;
font-weight: 400;
color: rgba(0, 0, 0, 0.55);
text-align: center;
white-space: pre-line;
}

#${BACKDROP_ID} {
position: fixed;
top: var(--headerv2-header-bottom, 0px);
left: 0;
right: 0;
bottom: 0;

z-index: 999997;

background: rgba(232, 232, 232, 0.28);

backdrop-filter: blur(14px) saturate(0.9);
-webkit-backdrop-filter: blur(14px) saturate(0.9);

opacity: 0;
visibility: hidden;
pointer-events: none;

transition:
opacity 320ms cubic-bezier(0.22, 1, 0.36, 1),
visibility 0s linear 320ms;
}

#${BACKDROP_ID}.is-open {
opacity: 1;
visibility: visible;
pointer-events: auto;

transition:
opacity 320ms cubic-bezier(0.22, 1, 0.36, 1),
visibility 0s linear 0s;
}

#${MENU_ID} {
position: fixed;

top: 0px;
left: 0;
right: 0;

z-index: 999998;

overflow: hidden;

box-sizing: border-box;

height: 0;

background: #fff;

opacity: 0;
visibility: hidden;
pointer-events: none;

transition:
height 380ms cubic-bezier(0.22, 1, 0.36, 1),
opacity 220ms ease,
visibility 0s linear 380ms;

padding-top: 52px;
}

#${MENU_ID}.is-open {
opacity: 1;
visibility: visible;
pointer-events: auto;

transition:
height 300ms cubic-bezier(0.5, 0.22, 0, 1),
opacity 220ms ease,
visibility 0s linear 0s;
}

#${MENU_ID} .headerv2-menu-inner {
width: min(1180px, calc(100% - 48px));

margin: 0 auto;

padding:
30px 0 34px;

box-sizing: border-box;
}

#${MENU_ID} .headerv2-menu-content {
opacity: 1;

transition:
opacity 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

#${MENU_ID} .headerv2-menu-content.is-fading {
opacity: 0;
}

#${MENU_ID} .headerv2-menu-title {
margin:
0 0 15px;

font-size:
13px;

line-height:
1.4;

font-weight:
600;

letter-spacing:
0.01em;

color:
rgba(0, 0, 0, 0.48);
}

#${MENU_ID} .headerv2-menu-list {
display:
flex;

flex-direction:
column;

margin:
0;

padding:
0;

list-style:
none;
}

#${MENU_ID} .headerv2-menu-list li {
margin:
0;

padding:
0;

opacity:
0;

transform:
translateY(5px);
}

#${MENU_ID}.is-open .headerv2-menu-list li {
animation:
headerv2-menu-item-in 300ms cubic-bezier(0.22, 1, 0.36, 1) forwards;

animation-delay:
calc(var(--headerv2-item-index, 0) * 55ms);
}

@keyframes headerv2-menu-item-in {
from {
opacity: 0;
transform: translateY(5px);
}

to {
opacity: 1;
transform: translateY(0);
}
}

#${MENU_ID} .headerv2-menu-link {
display:
block;

padding:
8px 0;

color:
#111;

text-decoration:
none;

font-size:
20px;

line-height:
1.5;

font-weight:
500;
}

@media (max-width: 680px) {
#${MENU_ID} .headerv2-menu-inner {
width:
calc(100% - 28px);

padding:
25px 0 30px;
}

#${MENU_ID} .headerv2-menu-link {
font-size:
18px;

padding:
8px 0;
}
}

@media (prefers-reduced-motion: reduce) {
#${MENU_ID},
#${MENU_ID} .headerv2-menu-content,
#${MENU_ID} .headerv2-menu-list li,
#${BACKDROP_ID} {
transition-duration:
1ms !important;
}

#${MENU_ID} .headerv2-menu-list li {
animation:
none !important;

opacity:
1 !important;

transform:
none !important;
}
}
`;

document.head.appendChild(style);

console.info(
`[${NS}] styles inserted.`
);

return true;
}

function insertHeader() {
if (!document.body) {
console.error(
`[${NS}] document.body not found.`
);
return null;
}

const existingHeader =
document.querySelector("header");

if (existingHeader) {
existingHeader.remove();

console.info(
`[${NS}] existing header removed.`
);
}

const temp =
document.createElement("div");

if (!temp) {
console.error(
`[${NS}] failed to create header temp.`
);
return null;
}

temp.innerHTML =
headerHTML.trim();

const headerElement =
temp.firstElementChild;

if (!headerElement) {
console.error(
`[${NS}] generated header not found.`
);
return null;
}

document.body.insertBefore(
headerElement,
document.body.firstChild
);

console.info(
`[${NS}] header inserted.`
);

return headerElement;
}

function insertFooter() {
if (!document.body) {
console.error(
`[${NS}] document.body not found.`
);
return null;
}

const existingFooter =
document.querySelector("footer");

if (existingFooter) {
existingFooter.remove();

console.info(
`[${NS}] existing footer removed.`
);
}

const temp =
document.createElement("div");

if (!temp) {
console.error(
`[${NS}] failed to create footer temp.`
);
return null;
}

temp.innerHTML =
footerHTML.trim();

const footerElement =
temp.firstElementChild;

if (!footerElement) {
console.error(
`[${NS}] generated footer not found.`
);
return null;
}

document.body.appendChild(
footerElement
);

console.info(
`[${NS}] footer inserted.`
);

return footerElement;
}

function createMenu() {
if (!document.body) {
console.error(
`[${NS}] document.body not found.`
);
return null;
}

const oldMenu =
document.getElementById(MENU_ID);

if (oldMenu) {
oldMenu.remove();
}

const oldBackdrop =
document.getElementById(BACKDROP_ID);

if (oldBackdrop) {
oldBackdrop.remove();
}

const menu =
document.createElement("div");

if (!menu) {
console.error(
`[${NS}] failed to create menu.`
);
return null;
}

menu.id =
MENU_ID;

const inner =
document.createElement("div");

if (!inner) {
console.error(
`[${NS}] failed to create menu inner.`
);
return null;
}

inner.className =
"headerv2-menu-inner";

const content =
document.createElement("div");

if (!content) {
console.error(
`[${NS}] failed to create menu content.`
);
return null;
}

content.className =
"headerv2-menu-content";

inner.appendChild(content);
menu.appendChild(inner);

const backdrop =
document.createElement("div");

if (!backdrop) {
console.error(
`[${NS}] failed to create backdrop.`
);
return null;
}

backdrop.id =
BACKDROP_ID;

document.body.appendChild(backdrop);
document.body.appendChild(menu);

console.info(
`[${NS}] menu created.`
);

return {
menu,
content,
backdrop
};
}

function updateHeaderPosition(headerElement) {
if (!headerElement) {
console.error(
`[${NS}] headerElement not found.`
);
return;
}

const rect =
headerElement.getBoundingClientRect();

if (!rect) {
console.error(
`[${NS}] failed to get header rect.`
);
return;
}

document.documentElement.style.setProperty(
"--headerv2-header-bottom",
`${Math.round(rect.bottom)}px`
);
}

function applyStaticTranslations(
headerElement,
footerElement
) {
const dictionary =
getI18n();

if (!headerElement) {
console.error(
`[${NS}] headerElement not found while applying translations.`
);
} else {
const headerNodes =
headerElement.querySelectorAll(
"[data-headerv2-i18n]"
);

if (!headerNodes) {
console.error(
`[${NS}] header translation nodes not found.`
);
} else {
for (const node of headerNodes) {
if (!node) {
console.error(
`[${NS}] invalid header translation node.`
);
continue;
}

const key =
node.getAttribute(
"data-headerv2-i18n"
);

if (!key) {
console.error(
`[${NS}] header translation key missing.`,
node
);
continue;
}

const [group, item] =
key.split(".");

const value =
dictionary[group]?.[item];

if (typeof value !== "string") {
console.error(
`[${NS}] header translation value not found: ${key}`
);
continue;
}

node.textContent =
value;
}
}
}

if (!footerElement) {
console.error(
`[${NS}] footerElement not found while applying translations.`
);
} else {
const footerNodes =
footerElement.querySelectorAll(
"[data-headerv2-i18n]"
);

if (!footerNodes) {
console.error(
`[${NS}] footer translation nodes not found.`
);
} else {
for (const node of footerNodes) {
if (!node) {
console.error(
`[${NS}] invalid footer translation node.`
);
continue;
}

const key =
node.getAttribute(
"data-headerv2-i18n"
);

if (!key) {
console.error(
`[${NS}] footer translation key missing.`,
node
);
continue;
}

const [group, item] =
key.split(".");

const value =
dictionary[group]?.[item];

if (typeof value !== "string") {
console.error(
`[${NS}] footer translation value not found: ${key}`
);
continue;
}

node.textContent =
value;
}
}
}

console.info(
`[${NS}] static translations applied: ${getSelectedLang()}`
);
}

function getMenuTranslation(type) {
const dictionary =
getI18n();

const menuTranslation =
dictionary.menus[type];

if (!menuTranslation) {
console.error(
`[${NS}] menu translation not found: ${type}`
);
return null;
}

return menuTranslation;
}

function renderMenu(
contentElement,
type
) {
if (!contentElement) {
console.error(
`[${NS}] menu content element not found.`
);
return false;
}

const config =
menuData[type];

if (!config) {
console.error(
`[${NS}] menu config not found: ${type}`
);
return false;
}

const translation =
getMenuTranslation(type);

if (!translation) {
return false;
}

if (
!Array.isArray(translation.items) ||
translation.items.length !== config.items.length
) {
console.error(
`[${NS}] menu translation item count mismatch: ${type}`
);
return false;
}

contentElement.replaceChildren();

const title =
document.createElement("div");

if (!title) {
console.error(
`[${NS}] failed to create title.`
);
return false;
}

title.className =
"headerv2-menu-title";

title.textContent =
translation.title;

const list =
document.createElement("ul");

if (!list) {
console.error(
`[${NS}] failed to create list.`
);
return false;
}

list.className =
"headerv2-menu-list";

for (
let index = 0;
index < config.items.length;
index += 1
) {
const item =
config.items[index];

const label =
translation.items[index];

if (
!item ||
typeof item.href !== "string" ||
typeof label !== "string"
) {
console.error(
`[${NS}] invalid translated menu item.`,
{
item,
label,
index
}
);
continue;
}

const li =
document.createElement("li");

if (!li) {
console.error(
`[${NS}] failed to create list item.`
);
continue;
}

const link =
document.createElement("a");

if (!link) {
console.error(
`[${NS}] failed to create link.`
);
continue;
}

link.className =
"headerv2-menu-link";

link.href =
item.href;

link.textContent =
label;

li.style.setProperty(
"--headerv2-item-index",
String(index)
);

li.appendChild(link);
list.appendChild(li);
}

contentElement.appendChild(title);
contentElement.appendChild(list);

console.info(
`[${NS}] rendered menu: ${type} (${getSelectedLang()})`
);

return true;
}

function setupNavigation(
headerElement,
menuParts
) {
if (!headerElement) {
console.error(
`[${NS}] headerElement not found.`
);
return;
}

if (
!menuParts ||
!menuParts.menu ||
!menuParts.content ||
!menuParts.backdrop
) {
console.error(
`[${NS}] menu parts incomplete.`
);
return;
}

const headerItems =
Array.from(
headerElement.children
).filter(
(element) =>
element instanceof HTMLElement
);

if (headerItems.length === 0) {
console.error(
`[${NS}] header items not found.`
);
return;
}

const triggers =
headerItems.filter(
(element) =>
element.hasAttribute(
"data-headerv2-menu"
)
);

if (triggers.length === 0) {
console.error(
`[${NS}] menu triggers not found.`
);
}

let activeType =
null;

let activeTrigger =
null;

let hoveredHeaderItem =
null;

let scrollCollapsed =
false;

let scrollCollapsedItem =
null;

let closeTimer =
null;

let switchTimer =
null;

let isClosing =
false;

function clearCloseTimer() {
if (closeTimer !== null) {
window.clearTimeout(
closeTimer
);

closeTimer =
null;
}
}

function clearSwitchTimer() {
if (switchTimer !== null) {
window.clearTimeout(
switchTimer
);

switchTimer =
null;
}
}

function setTriggerExpanded(
trigger,
expanded
) {
if (!trigger) {
console.error(
`[${NS}] trigger not found while updating aria-expanded.`
);
return;
}

trigger.setAttribute(
"aria-expanded",
String(expanded)
);
}

function resetTriggerStates() {
for (const trigger of triggers) {
if (!trigger) {
console.error(
`[${NS}] invalid trigger while resetting state.`
);
continue;
}

setTriggerExpanded(
trigger,
false
);
}

activeTrigger =
null;
}

function getHoveredHeaderItem() {
for (const item of headerItems) {
if (!item) {
console.error(
`[${NS}] invalid header item while checking hover.`
);
continue;
}

if (item.matches(":hover")) {
return item;
}
}

return null;
}

function isScrolled() {
return (
window.scrollY > 0 ||
window.pageYOffset > 0
);
}

function getMenuHeight() {
const inner =
menuParts.menu.querySelector(
".headerv2-menu-inner"
);

if (!inner) {
console.error(
`[${NS}] menu inner not found.`
);
return 0;
}

return inner.scrollHeight;
}

function setMenuHeight(height) {
if (
!Number.isFinite(height) ||
height < 0
) {
console.error(
`[${NS}] invalid menu height: ${height}`
);
return;
}

menuParts.menu.style.height =
`calc(${height}px + 64px)`;
}

function openMenu(type, trigger = null) {
if (!menuData[type]) {
console.error(
`[${NS}] unknown menu type: ${type}`
);
return;
}

clearCloseTimer();

isClosing =
false;

updateHeaderPosition(
headerElement
);

if (activeType === null) {
if (
!renderMenu(
menuParts.content,
type
)
) {
return;
}

activeType =
type;

activeTrigger =
trigger;

menuParts.menu.classList.add(
"is-open"
);

menuParts.backdrop.classList.add(
"is-open"
);

const height =
getMenuHeight();

setMenuHeight(
height
);

resetTriggerStates();

if (trigger) {
setTriggerExpanded(
trigger,
true
);
activeTrigger =
trigger;
}

console.info(
`[${NS}] menu opened: ${type}`
);

return;
}

if (activeType === type) {
if (trigger) {
resetTriggerStates();

setTriggerExpanded(
trigger,
true
);

activeTrigger =
trigger;
}

return;
}

clearSwitchTimer();

menuParts.content.classList.add(
"is-fading"
);

const previousHeight =
getMenuHeight();

setMenuHeight(
previousHeight
);

switchTimer =
window.setTimeout(
() => {
switchTimer =
null;

if (
!renderMenu(
menuParts.content,
type
)
) {
menuParts.content.classList.remove(
"is-fading"
);
return;
}

activeType =
type;

resetTriggerStates();

if (trigger) {
setTriggerExpanded(
trigger,
true
);

activeTrigger =
trigger;
}

const nextHeight =
getMenuHeight();

setMenuHeight(
nextHeight
);

requestAnimationFrame(
() => {
menuParts.content.classList.remove(
"is-fading"
);
}
);

console.info(
`[${NS}] menu switched: ${type}`
);
},
180
);
}

function closeMenu() {
clearCloseTimer();
clearSwitchTimer();

if (
activeType === null &&
!menuParts.menu.classList.contains(
"is-open"
)
) {
resetTriggerStates();
return;
}

isClosing =
true;

activeType =
null;

resetTriggerStates();

menuParts.backdrop.classList.remove(
"is-open"
);

menuParts.menu.classList.remove(
"is-open"
);

setMenuHeight(0);

menuParts.content.classList.remove(
"is-fading"
);

window.setTimeout(
() => {
if (
isClosing &&
!menuParts.menu.classList.contains(
"is-open"
)
) {
menuParts.menu.style.height =
"0px";
}
},
420
);

console.info(
`[${NS}] menu closed.`
);
}

function scheduleClose() {
clearCloseTimer();

closeTimer =
window.setTimeout(
() => {
closeTimer =
null;

const currentHeaderItem =
getHoveredHeaderItem();

const menuHovered =
menuParts.menu.matches(":hover");

if (
!currentHeaderItem &&
!menuHovered
) {
closeMenu();
}
},
80
);
}

function handleHeaderItemEnter(
item
) {
if (!item) {
console.error(
`[${NS}] header item missing on pointerenter.`
);
return;
}

clearCloseTimer();

const previousHoveredItem =
hoveredHeaderItem;

hoveredHeaderItem =
item;

if (scrollCollapsed) {
console.info(
`[${NS}] re-entered header item after scroll collapse; normal hover behavior restored.`
);

scrollCollapsed =
false;

scrollCollapsedItem =
null;
}

const type =
item.getAttribute(
"data-headerv2-menu"
);

if (!type) {
closeMenu();

console.info(
`[${NS}] non-menu header item hovered; menu closed.`
);

return;
}

if (
typeof type !== "string" ||
!menuData[type]
) {
console.error(
`[${NS}] invalid menu type on header item:`,
type
);

closeMenu();
return;
}

if (
previousHoveredItem === item &&
activeType === type
) {
console.info(
`[${NS}] same menu item remains hovered: ${type}`
);
return;
}

openMenu(
type,
item
);
}

function handleHeaderItemLeave(
item
) {
if (!item) {
console.error(
`[${NS}] header item missing on pointerleave.`
);
return;
}

if (
hoveredHeaderItem === item
) {
hoveredHeaderItem =
null;
}

scheduleClose();
}

for (const item of headerItems) {
if (!item) {
console.error(
`[${NS}] invalid header item.`
);
continue;
}

const type =
item.getAttribute(
"data-headerv2-menu"
);

if (type) {
if (!menuData[type]) {
console.error(
`[${NS}] unknown header menu type: ${type}`,
item
);
}

setTriggerExpanded(
item,
false
);
}

item.addEventListener(
"pointerenter",
() => {
handleHeaderItemEnter(
item
);
},
{
passive: true
}
);

item.addEventListener(
"pointerleave",
() => {
handleHeaderItemLeave(
item
);
},
{
passive: true
}
);

if (
item.getAttribute(
"data-headerv2-no-navigation"
) === "true"
) {
item.addEventListener(
"click",
(event) => {
event.preventDefault();
}
);
}
}

headerElement.addEventListener(
"pointerleave",
() => {
hoveredHeaderItem =
null;

if (scrollCollapsed || scrollCollapsedItem !== null) {
scrollCollapsed =
false;

scrollCollapsedItem =
null;

console.info(
`[${NS}] pointer left header; scroll-collapse hover state reset.`
);
}
},
{
passive: true
}
);

headerElement.addEventListener(
"pointermove",
(event) => {
if (!event) {
console.error(
`[${NS}] pointermove event missing.`
);
return;
}

if (
event.target === headerElement
) {
hoveredHeaderItem =
null;

closeMenu();

console.info(
`[${NS}] empty header area hovered; menu closed.`
);
}
},
{
passive: true
}
);

menuParts.menu.addEventListener(
"pointerenter",
() => {
clearCloseTimer();

console.info(
`[${NS}] menu hovered.`
);
},
{
passive: true
}
);

menuParts.menu.addEventListener(
"pointerleave",
() => {
scheduleClose();
},
{
passive: true
}
);

menuParts.backdrop.addEventListener(
"pointerenter",
() => {
scheduleClose();
},
{
passive: true
}
);

menuParts.backdrop.addEventListener(
"click",
() => {
closeMenu();
}
);

document.addEventListener(
"keydown",
(event) => {
if (!event) {
console.error(
`[${NS}] keydown event missing.`
);
return;
}

if (
event.key !== "Escape" ||
activeType === null
) {
return;
}

closeMenu();

console.info(
`[${NS}] Escape closed menu.`
);
}
);

window.addEventListener(
"resize",
() => {
updateHeaderPosition(
headerElement
);

if (
activeType !== null
) {
setMenuHeight(
getMenuHeight()
);
}
},
{
passive: true
}
);

window.addEventListener(
"scroll",
() => {
updateHeaderPosition(
headerElement
);

const currentHoveredItem =
getHoveredHeaderItem();

scrollCollapsed =
true;

scrollCollapsedItem =
currentHoveredItem;

closeMenu();

if (currentHoveredItem) {
console.info(
`[${NS}] scrolled; menu collapsed for current header item.`,
currentHoveredItem
);
} else {
console.info(
`[${NS}] scrolled; menu collapsed with no hovered header item.`
);
}
},
{
passive: true
}
);

updateHeaderPosition(
headerElement
);

console.info(
`[${NS}] navigation initialized with independent header-item hover tracking.`
);
}

function init() {
if (!document.head) {
console.error(
`[${NS}] document.head not found.`
);
return;
}

if (!document.body) {
console.error(
`[${NS}] document.body not found.`
);
return;
}

if (!injectStyle()) {
console.error(
`[${NS}] style injection failed.`
);
return;
}

const headerElement =
insertHeader();

if (!headerElement) {
console.error(
`[${NS}] header insertion failed.`
);
return;
}

const footerElement =
insertFooter();

if (!footerElement) {
console.error(
`[${NS}] footer insertion failed.`
);
}

applyStaticTranslations(
headerElement,
footerElement
);

const menuParts =
createMenu();

if (!menuParts) {
console.error(
`[${NS}] menu creation failed.`
);
return;
}

setupNavigation(
headerElement,
menuParts
);

console.info(
`[${NS}] initialization complete.`
);
}

if (
document.readyState ===
"loading"
) {
document.addEventListener(
"DOMContentLoaded",
init,
{
once: true
}
);

console.info(
`[${NS}] waiting for DOMContentLoaded.`
);
} else {
init();
}
})();