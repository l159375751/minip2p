(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&s(i)}).observe(document,{childList:!0,subtree:!0});function r(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(n){if(n.ep)return;n.ep=!0;const a=r(n);fetch(n.href,a)}})();const _=[{id:"gutenberg-11",title:"Alice's Adventures in Wonderland",author:"Lewis Carroll",size_kb:403,cover:"https://0x6d.net/minip2p/assets/alice.jpg",infohash:"sample-alice",nostr_event:"nostr:sample-alice",summary:"A curious girl falls through a rabbit hole into a world of whimsical logic."},{id:"gutenberg-84",title:"Frankenstein",author:"Mary Wollstonecraft Shelley",size_kb:512,cover:"https://0x6d.net/minip2p/assets/frankenstein.jpg",infohash:"sample-frankenstein",nostr_event:"nostr:sample-frankenstein",summary:"A scientist’s creation challenges the boundaries between life, death, and responsibility."},{id:"gutenberg-345",title:"Dracula",author:"Bram Stoker",size_kb:706,cover:"https://0x6d.net/minip2p/assets/dracula.jpg",infohash:"sample-dracula",nostr_event:"nostr:sample-dracula",summary:"Journal entries and letters chronicle the hunt for a night-walking count."},{id:"gutenberg-1342",title:"Pride and Prejudice",author:"Jane Austen",size_kb:723,cover:"https://0x6d.net/minip2p/assets/pride.jpg",infohash:"sample-pride",nostr_event:"nostr:sample-pride",summary:"Elizabeth Bennet learns to balance judgment with empathy amid regency-era society."},{id:"gutenberg-48320",title:"The Adventures of Sherlock Holmes",author:"Arthur Conan Doyle",size_kb:654,cover:"https://0x6d.net/minip2p/assets/sherlock.jpg",infohash:"sample-sherlock",nostr_event:"nostr:sample-sherlock",summary:"A dozen mysteries showcase Holmes’ deductive flair and Watson’s loyal narration."}],x=new Map;function $(e,t){const r=x.get(e);r&&r.forEach(s=>{try{s(t)}catch(n){console.error(`[event-bus] handler error on ${e}`,n)}})}function f(e){return new Promise((t,r)=>{e.oncomplete=e.onsuccess=()=>t(e.result),e.onabort=e.onerror=()=>r(e.error)})}function y(e,t){let r;const s=()=>{if(r)return r;const n=indexedDB.open(e);return n.onupgradeneeded=()=>n.result.createObjectStore(t),r=f(n),r.then(a=>{a.onclose=()=>r=void 0},()=>{}),r};return(n,a)=>s().then(i=>a(i.transaction(t,n).objectStore(t)))}let u;function b(){return u||(u=y("keyval-store","keyval")),u}function A(e,t=b()){return t("readonly",r=>f(r.get(e)))}function T(e,t,r=b()){return r("readwrite",s=>(s.put(t,e),f(s.transaction)))}const E="nostr-library-hub",z="state",d="library-items",l=typeof indexedDB<"u"?y(E,z):null,g=typeof window<"u"&&typeof window.localStorage<"u",w={parse(e,t){try{return JSON.parse(e)}catch{return t}},stringify(e,t="[]"){try{return JSON.stringify(e)}catch{return t}}},M=(e,t)=>g?w.parse(window.localStorage.getItem(e),t):t,I=(e,t)=>{g&&window.localStorage.setItem(e,w.stringify(t))};async function R(e,t){if(!l)return t;try{const r=await A(e,l);return typeof r>"u"?t:r}catch{return t}}async function C(e,t){if(l)try{await T(e,t,l)}catch{}}async function j(){const e=M(d,[]);return R(d,e)}async function v(e){const t=Array.isArray(e)?e:[];return I(d,t),await C(d,t),t}const o={manifest:_,library:[],initialized:!1},p=new Set;function h(){const e=c();p.forEach(t=>t(e)),$("state:update",e)}function c(){return{manifest:o.manifest,library:o.library,initialized:o.initialized}}function O(e){if(typeof e!="function")throw new TypeError("store.subscribe requires a function");return p.add(e),e(c()),()=>p.delete(e)}async function P(){if(o.initialized)return c();const e=await j();return o.library=Array.isArray(e)?e:[],o.initialized=!0,h(),c()}async function B(e){if(!e||!e.id)throw new Error("Cannot save item without id");return o.library.some(r=>r.id===e.id)||(o.library=[...o.library,e],await v(o.library),h()),c()}async function F(e){const t=o.library.filter(r=>r.id!==e);return t.length===o.library.length||(o.library=t,await v(o.library),h()),c()}function N(e=5){return o.manifest.slice(0,e)}const W=["wss://tracker.openwebtorrent.com","wss://tracker.webtorrent.dev","wss://tracker.btorrent.xyz","wss://tracker.fastcast.nz","udp://tracker.opentrackr.org:1337","udp://open.demonoid.ch:6969","udp://tracker.torrent.eu.org:451","udp://exodus.desync.com:6969"],S=(e,t=W)=>{if(!e)return"";const r=t.map(s=>`&tr=${encodeURIComponent(s)}`).join("");return`magnet:?xt=urn:btih:${e}${r}`},k=()=>N(5);function D(e,t){const r=t?"Remove from Library":"Save to Library",s=t?"remove":"save",n=e.infohash||"",a=n?S(n):"",i=a?`${a.slice(0,42)}...`:"n/a";return`
    <article class="library-card" data-id="${e.id}">
      <div class="library-card__meta">
        <h3>${e.title}</h3>
        <p>${e.author}</p>
      </div>
      <p class="library-card__summary">${e.summary}</p>
      <dl class="library-card__details">
        <div>
          <dt>Size</dt>
          <dd>${e.size_kb} KB</dd>
        </div>
        <div>
          <dt>Infohash</dt>
          <dd class="monospace" title="${n||"n/a"}">${n||"n/a"}</dd>
        </div>
        <div>
          <dt>Magnet Preview</dt>
          <dd class="monospace" title="${i}">${i}</dd>
        </div>
      </dl>
      <div class="library-card__actions">
        <button data-action="open" data-id="${e.id}" class="ghost">Open Preview</button>
        <button data-action="copy-magnet" data-id="${e.id}" class="ghost" ${a?"":"disabled"}>Copy Magnet</button>
        <button data-action="${s}" data-id="${e.id}">${r}</button>
      </div>
    </article>
  `}function J(e,t){const r=[],s=k();r.push("<section>"),r.push("<header><h2>Featured Shelf</h2><p>Boots offline using bundled manifest.</p></header>"),r.push('<div class="library-grid">'),r.push(s.map(n=>{const a=t.library.some(i=>i.id===n.id);return D(n,a)}).join("")),r.push("</div></section>"),e.innerHTML=r.join("")}function m(e){const t=e.target.dataset.action;if(!t)return;const{id:r}=e.target.dataset,s=k().find(n=>n.id===r);if(s){if(t==="open"){window.alert(`Preview for ${r} coming soon. Rendering sample manifest only right now.`);return}if(t==="copy-magnet"){const n=S(s.infohash);if(!n){window.alert("Missing infohash for this entry.");return}if(navigator.clipboard?.writeText)navigator.clipboard.writeText(n);else{const a=document.createElement("textarea");a.value=n,document.body.appendChild(a),a.select(),document.execCommand("copy"),document.body.removeChild(a)}window.alert("Magnet copied to clipboard.");return}t==="save"?B(s):t==="remove"&&F(r)}}function H(e){if(!e)throw new Error("mountLibraryShelf requires a container element");e.addEventListener("click",m);const t=O(r=>J(e,r));return()=>{e.removeEventListener("click",m),t()}}const L=document.querySelector("#app");if(!L)throw new Error('Root element #app was not found. Ensure index.html contains <div id="app"></div>.');L.innerHTML=`
  <main class="app-shell">
    <header class="app-header">
      <span class="badge">browser-only p2p</span>
      <h1>nostr library hub</h1>
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
`;const K=document.querySelector("#sample-shelf");(async()=>(await P(),H(K)))();
