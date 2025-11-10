(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function r(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(n){if(n.ep)return;n.ep=!0;const a=r(n);fetch(n.href,a)}})();const I=[{id:"gutenberg-11",title:"Alice's Adventures in Wonderland",author:"Lewis Carroll",size_kb:403,cover:"https://0x6d.net/minip2p/assets/alice.jpg",infohash:"sample-alice",nostr_event:"nostr:sample-alice",summary:"A curious girl falls through a rabbit hole into a world of whimsical logic."},{id:"gutenberg-84",title:"Frankenstein",author:"Mary Wollstonecraft Shelley",size_kb:512,cover:"https://0x6d.net/minip2p/assets/frankenstein.jpg",infohash:"sample-frankenstein",nostr_event:"nostr:sample-frankenstein",summary:"A scientist’s creation challenges the boundaries between life, death, and responsibility."},{id:"gutenberg-345",title:"Dracula",author:"Bram Stoker",size_kb:706,cover:"https://0x6d.net/minip2p/assets/dracula.jpg",infohash:"sample-dracula",nostr_event:"nostr:sample-dracula",summary:"Journal entries and letters chronicle the hunt for a night-walking count."},{id:"gutenberg-1342",title:"Pride and Prejudice",author:"Jane Austen",size_kb:723,cover:"https://0x6d.net/minip2p/assets/pride.jpg",infohash:"sample-pride",nostr_event:"nostr:sample-pride",summary:"Elizabeth Bennet learns to balance judgment with empathy amid regency-era society."},{id:"gutenberg-48320",title:"The Adventures of Sherlock Holmes",author:"Arthur Conan Doyle",size_kb:654,cover:"https://0x6d.net/minip2p/assets/sherlock.jpg",infohash:"sample-sherlock",nostr_event:"nostr:sample-sherlock",summary:"A dozen mysteries showcase Holmes’ deductive flair and Watson’s loyal narration."}],z=new Map;function j(e,t){const r=z.get(e);r&&r.forEach(s=>{try{s(t)}catch(n){console.error(`[event-bus] handler error on ${e}`,n)}})}function v(e){return new Promise((t,r)=>{e.oncomplete=e.onsuccess=()=>t(e.result),e.onabort=e.onerror=()=>r(e.error)})}function L(e,t){let r;const s=()=>{if(r)return r;const n=indexedDB.open(e);return n.onupgradeneeded=()=>n.result.createObjectStore(t),r=v(n),r.then(a=>{a.onclose=()=>r=void 0},()=>{}),r};return(n,a)=>s().then(o=>a(o.transaction(t,n).objectStore(t)))}let b;function $(){return b||(b=L("keyval-store","keyval")),b}function O(e,t=$()){return t("readonly",r=>v(r.get(e)))}function F(e,t,r=$()){return r("readwrite",s=>(s.put(t,e),v(s.transaction)))}const P="nostr-library-hub",D="state",h="library-items",y=typeof indexedDB<"u"?L(P,D):null,_=typeof window<"u"&&typeof window.localStorage<"u",x={parse(e,t){try{return JSON.parse(e)}catch{return t}},stringify(e,t="[]"){try{return JSON.stringify(e)}catch{return t}}},N=(e,t)=>_?x.parse(window.localStorage.getItem(e),t):t,H=(e,t)=>{_&&window.localStorage.setItem(e,x.stringify(t))};async function W(e,t){if(!y)return t;try{const r=await O(e,y);return typeof r>"u"?t:r}catch{return t}}async function B(e,t){if(y)try{await F(e,t,y)}catch{}}async function J(){const e=N(h,[]);return W(h,e)}async function A(e){const t=Array.isArray(e)?e:[];return H(h,t),await B(h,t),t}const c={manifest:I,library:[],initialized:!1},m=new Set;function T(){const e=d();m.forEach(t=>t(e)),j("state:update",e)}function d(){return{manifest:c.manifest,library:c.library,initialized:c.initialized}}function C(e){if(typeof e!="function")throw new TypeError("store.subscribe requires a function");return m.add(e),e(d()),()=>m.delete(e)}async function K(){c.library.length===0&&(c.library=c.manifest.slice(0,5).map(e=>({...e,addedAt:Date.now()})),await A(c.library))}async function G(){if(c.initialized)return d();const e=await J();return c.library=Array.isArray(e)?e:[],await K(),c.initialized=!0,T(),d()}async function Q(e){const t=c.library.filter(r=>r.id!==e);return t.length===c.library.length||(c.library=t,await A(c.library),T()),d()}const U=["wss://tracker.openwebtorrent.com","wss://tracker.webtorrent.dev","wss://tracker.btorrent.xyz","wss://tracker.fastcast.nz","udp://tracker.opentrackr.org:1337","udp://open.demonoid.ch:6969","udp://tracker.torrent.eu.org:451","udp://exodus.desync.com:6969"],p=(e,t=U)=>{if(!e)return"";const r=t.map(s=>`&tr=${encodeURIComponent(s)}`).join("");return`magnet:?xt=urn:btih:${e}${r}`},M=e=>e.manifest.slice(0,5),Y=e=>e.library.length?e.library:M(e);function V(e){const t=e.infohash||"",r=t?p(t):"";return`
    <article class="featured-card" data-id="${e.id}">
      <div>
        <strong>${e.title}</strong>
        <p>${e.author}</p>
      </div>
      <p>${e.summary}</p>
      <span class="monospace" title="${t||"n/a"}">${t||"n/a"}</span>
      <div class="featured-card__actions">
        <button data-action="open" data-id="${e.id}">Open</button>
        <button data-action="copy-magnet" data-id="${e.id}" ${r?"":"disabled"}>Copy Link</button>
      </div>
    </article>
  `}function X(e,t){const r=e.infohash||"",s=r?p(r):"";return`
    <li class="library-row" data-id="${e.id}">
      <div class="library-row__meta">
        <div>
          <strong>${e.title}</strong>
          <span>${e.author}</span>
        </div>
        <p>${e.summary}</p>
      </div>
      <div class="library-row__info monospace" title="${r||"n/a"}">${r||"n/a"}</div>
      <div class="library-row__actions">
        <button data-action="open" data-id="${e.id}" class="ghost">Open</button>
        <button data-action="copy-magnet" data-id="${e.id}" class="ghost" ${s?"":"disabled"}>Copy Link</button>
        <button data-action="remove" data-id="${e.id}" class="icon danger" ${t?"":"disabled"}>&times;</button>
      </div>
    </li>
  `}function Z(e,t){const r=[],s=Y(t);r.push("<section>"),r.push("<header><h2>Featured Shelves</h2><p>These are our own shared collections—trim them locally or open titles directly.</p></header>"),r.push('<ul class="library-list">'),r.push(s.map(n=>{const a=t.library.some(o=>o.id===n.id);return X(n,a)}).join("")),r.push("</ul></section>"),e.innerHTML=r.join("")}function ee(e,t){const r=e.target.dataset.action;if(!r)return;const{id:s}=e.target.dataset,n=t.library.find(i=>i.id===s),a=t.manifest.find(i=>i.id===s),o=n||a;if(o){if(r==="open"){const i=window.open("","_blank","noopener");i?(i.document.write(`
        <main style="font-family: system-ui; padding: 2rem; max-width: 720px; margin: auto;">
          <h1>${o.title}</h1>
          <p><strong>Author:</strong> ${o.author}</p>
          <p>This is a lightweight preview placeholder. Download via your preferred client using the infohash below:</p>
          <pre style="background:#f3f4f6; padding:1rem; border-radius:0.5rem; overflow:auto;">${o.infohash||"n/a"}</pre>
        </main>
      `),i.document.close()):window.alert("Unable to open preview window (pop-up blocked).");return}if(r==="copy-magnet"){const i=p(o.infohash);if(!i){window.alert("Missing infohash for this entry.");return}if(navigator.clipboard?.writeText)navigator.clipboard.writeText(i);else{const l=document.createElement("textarea");l.value=i,document.body.appendChild(l),l.select(),document.execCommand("copy"),document.body.removeChild(l)}window.alert("Magnet copied to clipboard.");return}r==="save"||r==="remove"&&Q(s)}}function R(e,t){const r=s=>ee(s,t());return e.addEventListener("click",r),()=>e.removeEventListener("click",r)}function te(e){if(!e)return()=>{};let t=d();const r=C(n=>{t=n;const a=M(n).map(V).join("");e.innerHTML=`<div class="featured-grid">${a}</div>`}),s=R(e,()=>t);return()=>{r(),s()}}function re(e){if(!e)return()=>{};let t=d();const r=C(n=>{t=n,Z(e,n)}),s=R(e,()=>t);return()=>{r(),s()}}const u={query:"",results:[],listeners:new Set};function g(){const e={query:u.query,results:u.results};u.listeners.forEach(t=>t(e))}function ne(e){return u.listeners.add(e),e({query:u.query,results:u.results}),()=>u.listeners.delete(e)}function k(e){u.query=e,se()}function f(e){return(e||"").toLowerCase()}function se(){const e=f(u.query);if(!e){u.results=[],g();return}const t=d(),r=[...t.manifest,...t.library],s=new Map;r.forEach(n=>{if(s.has(n.id))return;const a=f(n.title),o=f(n.author),i=f(n.infohash);(a.includes(e)||o.includes(e)||i.includes(e))&&s.set(n.id,n)}),u.results=Array.from(s.values()).slice(0,20),g()}function ae(){u.query="",u.results=[],g()}function oe(e){const t=e.infohash||"",r=t?p(t):"";return`
    <li class="search-result" data-id="${e.id}">
      <div>
        <strong>${e.title}</strong>
        <span>${e.author}</span>
      </div>
      <div class="search-result__actions">
        <button data-action="copy-magnet" data-infohash="${t}" ${r?"":"disabled"}>Copy Link</button>
      </div>
    </li>
  `}function ie(e,t,r,s){if(!e||!t||!r)return()=>{};const n=ne(l=>{t.innerHTML=l.results.length?`<ul class="search-results">${l.results.map(oe).join("")}</ul>`:'<p class="search-empty">No matches yet. Try title, author, or infohash.</p>'}),a=l=>k(l.target.value),o=l=>{l.preventDefault(),k(r.value)};r.addEventListener("input",a),e.addEventListener("submit",o),s&&s.addEventListener("click",()=>{r.value="",ae()});const i=l=>{const w=l.target.closest('button[data-action="copy-magnet"]');if(!w)return;const S=w.dataset.infohash;if(!S)return;const E=p(S);navigator.clipboard?.writeText(E)};return t.addEventListener("click",i),()=>{n(),r.removeEventListener("input",a),e.removeEventListener("submit",o),t.removeEventListener("click",i)}}const q=document.querySelector("#app");if(!q)throw new Error('Root element #app was not found. Ensure index.html contains <div id="app"></div>.');q.innerHTML=`
  <main class="app-shell">
    <header class="app-header">
      <span class="badge">browser based p2p</span>
      <h1>browser based p2p libraries & collections</h1>
      <p>
        Sleek, no-backend HTML/JS experience for sharing books, media, and manifests over
        Nostr + WebRTC/WebTorrent.
      </p>
    </header>
    <section id="featured-row"></section>
    <section id="library-list"></section>
    <section id="search-panel" class="search-panel">
      <header>
        <h2>Search Collections</h2>
        <p>Relay-powered discovery across browsers (local filter for now).</p>
      </header>
      <form id="search-form">
        <input id="search-input" type="text" placeholder="Search by title, author, or infohash" />
        <div class="search-actions">
          <button type="submit">Search</button>
          <button type="button" id="search-clear">Clear</button>
        </div>
      </form>
      <div id="search-results" class="search-results-wrapper"></div>
    </section>
    <section class="placeholder-panel">
      <p>
        Telemetry, search, and responder diagnostics will appear here once Nostr wiring lands.
      </p>
      <div class="status-cluster">
        <span class="status-pill">
          <strong>Relays</strong>
          <span>Pending wiring</span>
        </span>
        <span class="status-pill">
          <strong>Library</strong>
          <span>Sample manifest live</span>
        </span>
        <span class="status-pill">
          <strong>Transfers</strong>
          <span>WebRTC/WebTorrent adapters upcoming</span>
        </span>
      </div>
    </section>
  </main>
`;const ce=document.querySelector("#featured-row"),le=document.querySelector("#library-list"),ue=document.querySelector("#search-form"),de=document.querySelector("#search-input"),pe=document.querySelector("#search-clear"),fe=document.querySelector("#search-results");(async()=>(await G(),te(ce),re(le),ie(ue,fe,de,pe)))();
