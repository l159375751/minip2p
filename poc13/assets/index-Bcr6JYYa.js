(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&a(i)}).observe(document,{childList:!0,subtree:!0});function r(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(n){if(n.ep)return;n.ep=!0;const o=r(n);fetch(n.href,o)}})();const _=[{id:"gutenberg-11",title:"Alice's Adventures in Wonderland",author:"Lewis Carroll",size_kb:403,cover:"https://0x6d.net/minip2p/assets/alice.jpg",infohash:"sample-alice",nostr_event:"nostr:sample-alice",summary:"A curious girl falls through a rabbit hole into a world of whimsical logic."},{id:"gutenberg-84",title:"Frankenstein",author:"Mary Wollstonecraft Shelley",size_kb:512,cover:"https://0x6d.net/minip2p/assets/frankenstein.jpg",infohash:"sample-frankenstein",nostr_event:"nostr:sample-frankenstein",summary:"A scientist’s creation challenges the boundaries between life, death, and responsibility."},{id:"gutenberg-345",title:"Dracula",author:"Bram Stoker",size_kb:706,cover:"https://0x6d.net/minip2p/assets/dracula.jpg",infohash:"sample-dracula",nostr_event:"nostr:sample-dracula",summary:"Journal entries and letters chronicle the hunt for a night-walking count."},{id:"gutenberg-1342",title:"Pride and Prejudice",author:"Jane Austen",size_kb:723,cover:"https://0x6d.net/minip2p/assets/pride.jpg",infohash:"sample-pride",nostr_event:"nostr:sample-pride",summary:"Elizabeth Bennet learns to balance judgment with empathy amid regency-era society."},{id:"gutenberg-48320",title:"The Adventures of Sherlock Holmes",author:"Arthur Conan Doyle",size_kb:654,cover:"https://0x6d.net/minip2p/assets/sherlock.jpg",infohash:"sample-sherlock",nostr_event:"nostr:sample-sherlock",summary:"A dozen mysteries showcase Holmes’ deductive flair and Watson’s loyal narration."}],T=new Map;function E(e,t){const r=T.get(e);r&&r.forEach(a=>{try{a(t)}catch(n){console.error(`[event-bus] handler error on ${e}`,n)}})}function b(e){return new Promise((t,r)=>{e.oncomplete=e.onsuccess=()=>t(e.result),e.onabort=e.onerror=()=>r(e.error)})}function y(e,t){let r;const a=()=>{if(r)return r;const n=indexedDB.open(e);return n.onupgradeneeded=()=>n.result.createObjectStore(t),r=b(n),r.then(o=>{o.onclose=()=>r=void 0},()=>{}),r};return(n,o)=>a().then(i=>o(i.transaction(t,n).objectStore(t)))}let f;function g(){return f||(f=y("keyval-store","keyval")),f}function M(e,t=g()){return t("readonly",r=>b(r.get(e)))}function z(e,t,r=g()){return r("readwrite",a=>(a.put(t,e),b(a.transaction)))}const C="nostr-library-hub",I="state",u="library-items",p=typeof indexedDB<"u"?y(C,I):null,w=typeof window<"u"&&typeof window.localStorage<"u",v={parse(e,t){try{return JSON.parse(e)}catch{return t}},stringify(e,t="[]"){try{return JSON.stringify(e)}catch{return t}}},R=(e,t)=>w?v.parse(window.localStorage.getItem(e),t):t,j=(e,t)=>{w&&window.localStorage.setItem(e,v.stringify(t))};async function O(e,t){if(!p)return t;try{const r=await M(e,p);return typeof r>"u"?t:r}catch{return t}}async function F(e,t){if(p)try{await z(e,t,p)}catch{}}async function P(){const e=R(u,[]);return O(u,e)}async function S(e){const t=Array.isArray(e)?e:[];return j(u,t),await F(u,t),t}const s={manifest:_,library:[],initialized:!1},h=new Set;function $(){const e=l();h.forEach(t=>t(e)),E("state:update",e)}function l(){return{manifest:s.manifest,library:s.library,initialized:s.initialized}}function k(e){if(typeof e!="function")throw new TypeError("store.subscribe requires a function");return h.add(e),e(l()),()=>h.delete(e)}async function D(){s.library.length===0&&(s.library=s.manifest.slice(0,5).map(e=>({...e,addedAt:Date.now()})),await S(s.library))}async function N(){if(s.initialized)return l();const e=await P();return s.library=Array.isArray(e)?e:[],await D(),s.initialized=!0,$(),l()}async function B(e){const t=s.library.filter(r=>r.id!==e);return t.length===s.library.length||(s.library=t,await S(s.library),$()),l()}const H=["wss://tracker.openwebtorrent.com","wss://tracker.webtorrent.dev","wss://tracker.btorrent.xyz","wss://tracker.fastcast.nz","udp://tracker.opentrackr.org:1337","udp://open.demonoid.ch:6969","udp://tracker.torrent.eu.org:451","udp://exodus.desync.com:6969"],m=(e,t=H)=>{if(!e)return"";const r=t.map(a=>`&tr=${encodeURIComponent(a)}`).join("");return`magnet:?xt=urn:btih:${e}${r}`},L=e=>e.manifest.slice(0,5),W=e=>e.library.length?e.library:L(e);function J(e){const t=e.infohash||"",r=t?m(t):"",a=r?`${r.slice(0,32)}...`:"n/a";return`
    <article class="featured-card" data-id="${e.id}">
      <div>
        <strong>${e.title}</strong>
        <p>${e.author}</p>
      </div>
      <p>${e.summary}</p>
      <span class="monospace" title="${a}">${a}</span>
      <div class="featured-card__actions">
        <button data-action="open" data-id="${e.id}">Open</button>
        <button data-action="copy-magnet" data-id="${e.id}" ${r?"":"disabled"}>Copy</button>
      </div>
    </article>
  `}function K(e,t){const r=e.infohash||"",a=r?m(r):"",n=a?`${a.slice(0,42)}...`:"n/a";return`
    <li class="library-row" data-id="${e.id}">
      <div class="library-row__meta">
        <div>
          <strong>${e.title}</strong>
          <span>${e.author}</span>
        </div>
        <p>${e.summary}</p>
      </div>
      <div class="library-row__info monospace">
        <span title="${r||"n/a"}">${r||"n/a"}</span>
        <span title="${n}">${n}</span>
      </div>
      <div class="library-row__actions">
        <button data-action="open" data-id="${e.id}" class="ghost">Open</button>
        <button data-action="copy-magnet" data-id="${e.id}" class="ghost" ${a?"":"disabled"}>Copy</button>
        <button data-action="remove" data-id="${e.id}" class="icon danger" ${t?"":"disabled"}>&times;</button>
      </div>
    </li>
  `}function q(e,t){const r=[],a=W(t);r.push("<section>"),r.push("<header><h2>Featured Shelves</h2><p>These are our own shared collections—trim them locally or open titles directly.</p></header>"),r.push('<ul class="library-list">'),r.push(a.map(n=>{const o=t.library.some(i=>i.id===n.id);return K(n,o)}).join("")),r.push("</ul></section>"),e.innerHTML=r.join("")}function G(e,t){const r=e.target.dataset.action;if(!r)return;const{id:a}=e.target.dataset,n=t.library.find(c=>c.id===a),o=t.manifest.find(c=>c.id===a),i=n||o;if(i){if(r==="open"){const c=window.open("","_blank","noopener");c?(c.document.write(`
        <main style="font-family: system-ui; padding: 2rem; max-width: 720px; margin: auto;">
          <h1>${i.title}</h1>
          <p><strong>Author:</strong> ${i.author}</p>
          <p>This is a lightweight preview placeholder. Download via your preferred client using the infohash below:</p>
          <pre style="background:#f3f4f6; padding:1rem; border-radius:0.5rem; overflow:auto;">${i.infohash||"n/a"}</pre>
        </main>
      `),c.document.close()):window.alert("Unable to open preview window (pop-up blocked).");return}if(r==="copy-magnet"){const c=m(i.infohash);if(!c){window.alert("Missing infohash for this entry.");return}if(navigator.clipboard?.writeText)navigator.clipboard.writeText(c);else{const d=document.createElement("textarea");d.value=c,document.body.appendChild(d),d.select(),document.execCommand("copy"),document.body.removeChild(d)}window.alert("Magnet copied to clipboard.");return}r==="save"||r==="remove"&&B(a)}}function x(e,t){const r=a=>G(a,t());return e.addEventListener("click",r),()=>e.removeEventListener("click",r)}function U(e){if(!e)return()=>{};let t=l();const r=k(n=>{t=n;const o=L(n).map(J).join("");e.innerHTML=`<div class="featured-grid">${o}</div>`}),a=x(e,()=>t);return()=>{r(),a()}}function Y(e){if(!e)return()=>{};let t=l();const r=k(n=>{t=n,q(e,n)}),a=x(e,()=>t);return()=>{r(),a()}}const A=document.querySelector("#app");if(!A)throw new Error('Root element #app was not found. Ensure index.html contains <div id="app"></div>.');A.innerHTML=`
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
        <p>Relay-powered discovery across browsers. Hooking in shortly.</p>
      </header>
      <form>
        <input type="text" placeholder="Search by title, author, or infohash" disabled />
        <button type="button" disabled>Search (soon)</button>
      </form>
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
`;const Q=document.querySelector("#featured-row"),V=document.querySelector("#library-list");(async()=>(await N(),U(Q),Y(V)))();
