(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const c of s.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&a(c)}).observe(document,{childList:!0,subtree:!0});function r(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function a(n){if(n.ep)return;n.ep=!0;const s=r(n);fetch(n.href,s)}})();const _=[{id:"gutenberg-11",title:"Alice's Adventures in Wonderland",author:"Lewis Carroll",size_kb:403,cover:"https://0x6d.net/minip2p/assets/alice.jpg",magnet:"magnet:?xt=urn:btih:sample-alice",nostr_event:"nostr:sample-alice",summary:"A curious girl falls through a rabbit hole into a world of whimsical logic."},{id:"gutenberg-84",title:"Frankenstein",author:"Mary Wollstonecraft Shelley",size_kb:512,cover:"https://0x6d.net/minip2p/assets/frankenstein.jpg",magnet:"magnet:?xt=urn:btih:sample-frankenstein",nostr_event:"nostr:sample-frankenstein",summary:"A scientist’s creation challenges the boundaries between life, death, and responsibility."},{id:"gutenberg-345",title:"Dracula",author:"Bram Stoker",size_kb:706,cover:"https://0x6d.net/minip2p/assets/dracula.jpg",magnet:"magnet:?xt=urn:btih:sample-dracula",nostr_event:"nostr:sample-dracula",summary:"Journal entries and letters chronicle the hunt for a night-walking count."},{id:"gutenberg-1342",title:"Pride and Prejudice",author:"Jane Austen",size_kb:723,cover:"https://0x6d.net/minip2p/assets/pride.jpg",magnet:"magnet:?xt=urn:btih:sample-pride",nostr_event:"nostr:sample-pride",summary:"Elizabeth Bennet learns to balance judgment with empathy amid regency-era society."},{id:"gutenberg-48320",title:"The Adventures of Sherlock Holmes",author:"Arthur Conan Doyle",size_kb:654,cover:"https://0x6d.net/minip2p/assets/sherlock.jpg",magnet:"magnet:?xt=urn:btih:sample-sherlock",nostr_event:"nostr:sample-sherlock",summary:"A dozen mysteries showcase Holmes’ deductive flair and Watson’s loyal narration."}],x=new Map;function k(e,t){const r=x.get(e);r&&r.forEach(a=>{try{a(t)}catch(n){console.error(`[event-bus] handler error on ${e}`,n)}})}function f(e){return new Promise((t,r)=>{e.oncomplete=e.onsuccess=()=>t(e.result),e.onabort=e.onerror=()=>r(e.error)})}function y(e,t){let r;const a=()=>{if(r)return r;const n=indexedDB.open(e);return n.onupgradeneeded=()=>n.result.createObjectStore(t),r=f(n),r.then(s=>{s.onclose=()=>r=void 0},()=>{}),r};return(n,s)=>a().then(c=>s(c.transaction(t,n).objectStore(t)))}let u;function b(){return u||(u=y("keyval-store","keyval")),u}function A(e,t=b()){return t("readonly",r=>f(r.get(e)))}function E(e,t,r=b()){return r("readwrite",a=>(a.put(t,e),f(a.transaction)))}const T="nostr-library-hub",z="state",l="library-items",d=typeof indexedDB<"u"?y(T,z):null,g=typeof window<"u"&&typeof window.localStorage<"u",v={parse(e,t){try{return JSON.parse(e)}catch{return t}},stringify(e,t="[]"){try{return JSON.stringify(e)}catch{return t}}},$=(e,t)=>g?v.parse(window.localStorage.getItem(e),t):t,O=(e,t)=>{g&&window.localStorage.setItem(e,v.stringify(t))};async function j(e,t){if(!d)return t;try{const r=await A(e,d);return typeof r>"u"?t:r}catch{return t}}async function M(e,t){if(d)try{await E(e,t,d)}catch{}}async function R(){const e=$(l,[]);return j(l,e)}async function w(e){const t=Array.isArray(e)?e:[];return O(l,t),await M(l,t),t}const i={manifest:_,library:[],initialized:!1},p=new Set;function m(){const e=o();p.forEach(t=>t(e)),k("state:update",e)}function o(){return{manifest:i.manifest,library:i.library,initialized:i.initialized}}function I(e){if(typeof e!="function")throw new TypeError("store.subscribe requires a function");return p.add(e),e(o()),()=>p.delete(e)}async function P(){if(i.initialized)return o();const e=await R();return i.library=Array.isArray(e)?e:[],i.initialized=!0,m(),o()}async function B(e){if(!e||!e.id)throw new Error("Cannot save item without id");return i.library.some(r=>r.id===e.id)||(i.library=[...i.library,e],await w(i.library),m()),o()}async function N(e){const t=i.library.filter(r=>r.id!==e);return t.length===i.library.length||(i.library=t,await w(i.library),m()),o()}function S(e=5){return i.manifest.slice(0,e)}function C(e,t){const r=t?"Remove from Library":"Save to Library",a=t?"remove":"save";return`
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
          <dt>Magnet</dt>
          <dd title="${e.magnet}">${e.magnet.slice(0,26)}...</dd>
        </div>
      </dl>
      <div class="library-card__actions">
        <button data-action="open" data-id="${e.id}" class="ghost">Open Preview</button>
        <button data-action="${a}" data-id="${e.id}">${r}</button>
      </div>
    </article>
  `}function F(e,t){const r=[],a=S(5);r.push("<section>"),r.push("<header><h2>Featured Shelf</h2><p>Boots offline using bundled manifest.</p></header>"),r.push('<div class="library-grid">'),r.push(a.map(n=>{const s=t.library.some(c=>c.id===n.id);return C(n,s)}).join("")),r.push("</div></section>"),e.innerHTML=r.join("")}function h(e){const t=e.target.dataset.action;if(!t)return;const{id:r}=e.target.dataset;if(t==="open"){window.alert(`Preview for ${r} coming soon. Rendering sample manifest only right now.`);return}const a=S(5).find(n=>n.id===r);a&&(t==="save"?B(a):t==="remove"&&N(r))}function W(e){if(!e)throw new Error("mountLibraryShelf requires a container element");e.addEventListener("click",h);const t=I(r=>F(e,r));return()=>{e.removeEventListener("click",h),t()}}const L=document.querySelector("#app");if(!L)throw new Error('Root element #app was not found. Ensure index.html contains <div id="app"></div>.');L.innerHTML=`
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
`;const D=document.querySelector("#sample-shelf");(async()=>(await P(),W(D)))();
