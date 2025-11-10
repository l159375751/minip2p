(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&a(i)}).observe(document,{childList:!0,subtree:!0});function r(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(n){if(n.ep)return;n.ep=!0;const o=r(n);fetch(n.href,o)}})();const x=[{id:"gutenberg-11",title:"Alice's Adventures in Wonderland",author:"Lewis Carroll",size_kb:403,cover:"https://0x6d.net/minip2p/assets/alice.jpg",infohash:"sample-alice",nostr_event:"nostr:sample-alice",summary:"A curious girl falls through a rabbit hole into a world of whimsical logic."},{id:"gutenberg-84",title:"Frankenstein",author:"Mary Wollstonecraft Shelley",size_kb:512,cover:"https://0x6d.net/minip2p/assets/frankenstein.jpg",infohash:"sample-frankenstein",nostr_event:"nostr:sample-frankenstein",summary:"A scientist’s creation challenges the boundaries between life, death, and responsibility."},{id:"gutenberg-345",title:"Dracula",author:"Bram Stoker",size_kb:706,cover:"https://0x6d.net/minip2p/assets/dracula.jpg",infohash:"sample-dracula",nostr_event:"nostr:sample-dracula",summary:"Journal entries and letters chronicle the hunt for a night-walking count."},{id:"gutenberg-1342",title:"Pride and Prejudice",author:"Jane Austen",size_kb:723,cover:"https://0x6d.net/minip2p/assets/pride.jpg",infohash:"sample-pride",nostr_event:"nostr:sample-pride",summary:"Elizabeth Bennet learns to balance judgment with empathy amid regency-era society."},{id:"gutenberg-48320",title:"The Adventures of Sherlock Holmes",author:"Arthur Conan Doyle",size_kb:654,cover:"https://0x6d.net/minip2p/assets/sherlock.jpg",infohash:"sample-sherlock",nostr_event:"nostr:sample-sherlock",summary:"A dozen mysteries showcase Holmes’ deductive flair and Watson’s loyal narration."}],$=new Map;function _(e,t){const r=$.get(e);r&&r.forEach(a=>{try{a(t)}catch(n){console.error(`[event-bus] handler error on ${e}`,n)}})}function m(e){return new Promise((t,r)=>{e.oncomplete=e.onsuccess=()=>t(e.result),e.onabort=e.onerror=()=>r(e.error)})}function y(e,t){let r;const a=()=>{if(r)return r;const n=indexedDB.open(e);return n.onupgradeneeded=()=>n.result.createObjectStore(t),r=m(n),r.then(o=>{o.onclose=()=>r=void 0},()=>{}),r};return(n,o)=>a().then(i=>o(i.transaction(t,n).objectStore(t)))}let f;function b(){return f||(f=y("keyval-store","keyval")),f}function A(e,t=b()){return t("readonly",r=>m(r.get(e)))}function T(e,t,r=b()){return r("readwrite",a=>(a.put(t,e),m(a.transaction)))}const E="nostr-library-hub",z="state",u="library-items",p=typeof indexedDB<"u"?y(E,z):null,g=typeof window<"u"&&typeof window.localStorage<"u",w={parse(e,t){try{return JSON.parse(e)}catch{return t}},stringify(e,t="[]"){try{return JSON.stringify(e)}catch{return t}}},M=(e,t)=>g?w.parse(window.localStorage.getItem(e),t):t,R=(e,t)=>{g&&window.localStorage.setItem(e,w.stringify(t))};async function j(e,t){if(!p)return t;try{const r=await A(e,p);return typeof r>"u"?t:r}catch{return t}}async function I(e,t){if(p)try{await T(e,t,p)}catch{}}async function O(){const e=M(u,[]);return j(u,e)}async function v(e){const t=Array.isArray(e)?e:[];return R(u,t),await I(u,t),t}const s={manifest:x,library:[],initialized:!1},h=new Set;function S(){const e=l();h.forEach(t=>t(e)),_("state:update",e)}function l(){return{manifest:s.manifest,library:s.library,initialized:s.initialized}}function C(e){if(typeof e!="function")throw new TypeError("store.subscribe requires a function");return h.add(e),e(l()),()=>h.delete(e)}async function P(){s.library.length===0&&(s.library=s.manifest.slice(0,5).map(e=>({...e,addedAt:Date.now()})),await v(s.library))}async function D(){if(s.initialized)return l();const e=await O();return s.library=Array.isArray(e)?e:[],await P(),s.initialized=!0,S(),l()}async function F(e){const t=s.library.filter(r=>r.id!==e);return t.length===s.library.length||(s.library=t,await v(s.library),S()),l()}const N=["wss://tracker.openwebtorrent.com","wss://tracker.webtorrent.dev","wss://tracker.btorrent.xyz","wss://tracker.fastcast.nz","udp://tracker.opentrackr.org:1337","udp://open.demonoid.ch:6969","udp://tracker.torrent.eu.org:451","udp://exodus.desync.com:6969"],k=(e,t=N)=>{if(!e)return"";const r=t.map(a=>`&tr=${encodeURIComponent(a)}`).join("");return`magnet:?xt=urn:btih:${e}${r}`};function B(e,t){const r=e.infohash||"",a=r?k(r):"",n=a?`${a.slice(0,42)}...`:"n/a";return`
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
  `}function W(e,t){const r=[],a=t.library.length?t.library:t.manifest.slice(0,5);r.push("<section>"),r.push("<header><h2>Featured Shelves</h2><p>These are our own shared collections—trim them locally or open titles directly.</p></header>"),r.push('<ul class="library-list">'),r.push(a.map(n=>{const o=t.library.some(i=>i.id===n.id);return B(n,o)}).join("")),r.push("</ul></section>"),e.innerHTML=r.join("")}function H(e,t){const r=e.target.dataset.action;if(!r)return;const{id:a}=e.target.dataset,n=t.library.find(c=>c.id===a),o=t.manifest.find(c=>c.id===a),i=n||o;if(i){if(r==="open"){const c=window.open("","_blank","noopener");c?(c.document.write(`
        <main style="font-family: system-ui; padding: 2rem; max-width: 720px; margin: auto;">
          <h1>${i.title}</h1>
          <p><strong>Author:</strong> ${i.author}</p>
          <p>This is a lightweight preview placeholder. Download via your preferred client using the infohash below:</p>
          <pre style="background:#f3f4f6; padding:1rem; border-radius:0.5rem; overflow:auto;">${i.infohash||"n/a"}</pre>
        </main>
      `),c.document.close()):window.alert("Unable to open preview window (pop-up blocked).");return}if(r==="copy-magnet"){const c=k(i.infohash);if(!c){window.alert("Missing infohash for this entry.");return}if(navigator.clipboard?.writeText)navigator.clipboard.writeText(c);else{const d=document.createElement("textarea");d.value=c,document.body.appendChild(d),d.select(),document.execCommand("copy"),document.body.removeChild(d)}window.alert("Magnet copied to clipboard.");return}r==="save"||r==="remove"&&F(a)}}function J(e){if(!e)throw new Error("mountLibraryShelf requires a container element");let t=l();const r=n=>H(n,t);e.addEventListener("click",r);const a=C(n=>{t=n,W(e,n)});return()=>{e.removeEventListener("click",r),a()}}const L=document.querySelector("#app");if(!L)throw new Error('Root element #app was not found. Ensure index.html contains <div id="app"></div>.');L.innerHTML=`
  <main class="app-shell">
    <header class="app-header">
      <span class="badge">browser based p2p</span>
      <h1>browser based p2p libraries & collections</h1>
      <p>
        Sleek, no-backend HTML/JS experience for sharing books, media, and manifests over
        Nostr + WebRTC/WebTorrent.
      </p>
    </header>
    <section id="sample-shelf"></section>
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
`;const K=document.querySelector("#sample-shelf");(async()=>(await D(),J(K)))();
