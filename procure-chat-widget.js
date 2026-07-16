/*!
 * Procure Media — agentic site chat widget
 * -------------------------------------------------------------
 * A floating chat bubble that runs a REAL conversation (LLM, gpt-4o-mini) fenced by the
 * approved per-segment qualify->capture flow. The visitor picks "Which best describes you?"
 * (mirrors the homepage funnel), then chats — the assistant qualifies with personality, and
 * when it has the visitor's name + phone it captures the lead server-side (POST /chat on the
 * Procure lead engine; the worker holds the OpenAI key + writes the lead via the trusted path).
 *
 * The worker enforces the guardrails + capture; this widget is just the chat UI. SMS stays OFF
 * until the (855) toll-free SMS number clears (worker side). Self-contained, namespaced (.pmcw-*).
 * -------------------------------------------------------------
 */
(function () {
  if (window.__pmChatWidget) return;            // guard against double-include
  window.__pmChatWidget = true;

  // Site-aware: the widget self-configures by hostname (or window.PMCW_CONFIG). The SAME file works
  // on every Procure site — it sends its `site` to /chat, which drives the persona + lead routing.
  var HOSTS = {
    'hoacontracts.com': { site: 'hoacontracts.com', brand: 'HOA Contracts', phoneDisplay: '(208) 361-4295', phoneTel: '+12083614295' }
  };
  function pmcwSite() {
    try { var h = (location.hostname || '').replace(/^www\./, ''); for (var k in HOSTS) { if (h.indexOf(k) !== -1) return HOSTS[k]; } } catch (e) {}
    return { site: 'procuremedia.com', brand: 'Procure Media', phoneDisplay: '(855) 754-5015', phoneTel: '+18557545015' };
  }
  var SITECFG = Object.assign(pmcwSite(), (window.PMCW_CONFIG || {}));
  var CONFIG = {
    CHAT_ENDPOINT: 'https://procure-lead-engine.dan-fda.workers.dev/chat',
    SITE: SITECFG.site,
    BRAND: SITECFG.brand,
    PHONE_DISPLAY: SITECFG.phoneDisplay,
    PHONE_TEL: SITECFG.phoneTel
  };

  var C = { navy:'#0B3558', navyDark:'#07253D', gold:'#F4A621', goldDark:'#D88D13',
            text:'#142132', muted:'#6E7A8A', line:'#E5EBF2', light:'#F7F9FC' };

  var css = [
    '.pmcw-btn{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:flex;align-items:center;gap:10px;',
      'background:'+C.gold+';color:#111;border:none;border-radius:999px;padding:14px 20px;font:800 15px/1 Inter,system-ui,sans-serif;',
      'cursor:pointer;box-shadow:0 10px 28px rgba(11,53,88,.28);transition:transform .18s ease,background .18s ease;}',
    '.pmcw-btn:hover{background:'+C.goldDark+';transform:translateY(-2px);}',
    '.pmcw-btn svg{width:20px;height:20px;display:block;}',
    '@media(max-width:520px){.pmcw-btn{right:14px;bottom:14px;padding:13px 16px;}.pmcw-btn .pmcw-btxt{display:none;}}',
    '.pmcw-panel{position:fixed;right:20px;bottom:20px;z-index:2147483001;width:370px;max-width:calc(100vw - 32px);',
      'display:none;flex-direction:column;background:#fff;border-radius:18px;overflow:hidden;',
      'box-shadow:0 24px 60px rgba(7,37,61,.30);font:400 15px/1.5 Inter,system-ui,sans-serif;color:'+C.text+';}',
    '.pmcw-panel.pmcw-open{display:flex;animation:pmcw-in .18s ease;}',
    '@keyframes pmcw-in{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}',
    '@media(max-width:520px){.pmcw-panel{right:8px;left:8px;bottom:8px;width:auto;}}',
    '.pmcw-head{background:linear-gradient(160deg,'+C.navy+' 0%,'+C.navyDark+' 100%);color:#fff;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;}',
    '.pmcw-head h3{margin:0;font:800 16px/1.2 Inter,sans-serif;}',
    '.pmcw-head p{margin:3px 0 0;font-size:12.5px;color:#D3DCE7;}',
    '.pmcw-x{background:rgba(255,255,255,.12);border:none;color:#fff;width:30px;height:30px;border-radius:8px;font-size:18px;cursor:pointer;line-height:1;}',
    '.pmcw-x:hover{background:rgba(255,255,255,.22);}',
    '.pmcw-body{padding:18px;overflow-y:auto;max-height:min(560px,calc(100vh - 120px));}',
    '.pmcw-msg{background:'+C.light+';border:1px solid '+C.line+';border-radius:14px;padding:12px 14px;margin-bottom:14px;font-size:14.5px;}',
    '.pmcw-chips{display:flex;flex-direction:column;gap:9px;}',
    '.pmcw-chip{text-align:left;background:#fff;border:1.5px solid '+C.line+';border-radius:12px;padding:13px 15px;font:700 14.5px Inter,sans-serif;color:'+C.navy+';cursor:pointer;transition:.15s;}',
    '.pmcw-chip:hover{border-color:'+C.gold+';background:'+C.light+';transform:translateY(-1px);}',
    '.pmcw-chip b{display:block;font-weight:800;}',
    '.pmcw-chip span{display:block;margin-top:3px;font-weight:500;font-size:12px;color:'+C.muted+';}',
    '.pmcw-chatbody{height:min(460px,58vh);display:flex;flex-direction:column;padding:14px;overflow:hidden;}',
    '.pmcw-thread{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding-right:4px;}',
    '.pmcw-b{max-width:86%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;}',
    '.pmcw-b.bot{align-self:flex-start;background:'+C.light+';border:1px solid '+C.line+';color:'+C.text+';border-bottom-left-radius:5px;}',
    '.pmcw-b.me{align-self:flex-end;background:'+C.navy+';color:#fff;border-bottom-right-radius:5px;}',
    '.pmcw-b a{color:inherit;text-decoration:underline;}',
    '.pmcw-typing{align-self:flex-start;display:flex;gap:4px;padding:12px 14px;background:'+C.light+';border:1px solid '+C.line+';border-radius:14px;border-bottom-left-radius:5px;}',
    '.pmcw-typing i{width:7px;height:7px;border-radius:50%;background:'+C.muted+';animation:pmcw-bounce 1.2s infinite;}',
    '.pmcw-typing i:nth-child(2){animation-delay:.15s;}.pmcw-typing i:nth-child(3){animation-delay:.3s;}',
    '@keyframes pmcw-bounce{0%,60%,100%{opacity:.3;transform:translateY(0);}30%{opacity:1;transform:translateY(-3px);}}',
    '.pmcw-inputrow{flex:0 0 auto;display:flex;gap:8px;align-items:flex-end;border-top:1px solid '+C.line+';padding-top:12px;margin-top:10px;}',
    '.pmcw-inputrow textarea{flex:1;border:1.5px solid '+C.line+';border-radius:12px;padding:10px 12px;font:400 14.5px Inter,sans-serif;color:'+C.text+';resize:none;height:42px;max-height:90px;}',
    '.pmcw-inputrow textarea:focus{outline:none;border-color:'+C.gold+';box-shadow:0 0 0 3px rgba(244,166,33,.16);}',
    '.pmcw-inputrow button{flex:0 0 auto;background:'+C.gold+';color:#111;border:none;border-radius:12px;padding:0 16px;height:42px;font:800 14px Inter,sans-serif;cursor:pointer;}',
    '.pmcw-inputrow button:disabled{opacity:.5;cursor:default;}',
    '.pmcw-call{display:inline-block;background:'+C.navy+';color:#fff;border-radius:11px;padding:11px 18px;font:800 14px Inter,sans-serif;text-decoration:none;}',
    '@media(prefers-reduced-motion:reduce){.pmcw-btn,.pmcw-panel,.pmcw-chip,.pmcw-typing i{transition:none;animation:none;}}'
  ].join('');

  var style = document.createElement('style');
  style.setAttribute('data-pmcw', '');
  style.textContent = css;
  document.head.appendChild(style);

  // ---- launcher ----
  var btn = document.createElement('button');
  btn.className = 'pmcw-btn';
  btn.setAttribute('aria-label', 'Open chat');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.9-5.4A8.5 8.5 0 1 1 21 11.5z"/></svg><span class="pmcw-btxt">Chat with us</span>';

  var panel = document.createElement('div');
  panel.className = 'pmcw-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Chat with Procure Media');
  document.addEventListener('DOMContentLoaded', mount);
  if (document.readyState !== 'loading') mount();
  function mount() { if (!document.body || btn.parentNode) return; document.body.appendChild(btn); document.body.appendChild(panel); }

  var state = { segment: '', messages: [], done: false, busy: false };

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function linkify(s){ return s.replace(/(https?:\/\/[^\s]+|(?:signup|app)\.procuremedia\.com[^\s]*)/g, function(u){
    var href = u.indexOf('http') === 0 ? u : 'https://' + u; return '<a href="'+href+'" target="_blank" rel="noopener">'+u+'</a>'; }); }

  function render(screen, isChat) {
    panel.innerHTML = '<div class="pmcw-head"><div><h3>Chat with ' + esc(CONFIG.BRAND) + '</h3><p>We reply fast — usually within minutes.</p></div>'
      + '<button class="pmcw-x" aria-label="Close chat">&times;</button></div>'
      + '<div class="pmcw-body' + (isChat ? ' pmcw-chatbody' : '') + '">' + screen + '</div>';
    panel.querySelector('.pmcw-x').addEventListener('click', close);
  }

  // Intro mirrors the homepage "Which best describes you?" funnel.
  function screenIntro() {
    return '<div class="pmcw-msg">Which best describes you?</div>'
      + '<div class="pmcw-chips">'
      + '<button class="pmcw-chip" data-seg="get-customers"><b>I run a small business and need more customers</b><span>I\'m an independent business and need to stop missing calls and leads.</span></button>'
      + '<button class="pmcw-chip" data-seg="enterprise"><b>I run a large sales organization</b><span>I need an all-inclusive platform for my whole sales team.</span></button>'
      + '<button class="pmcw-chip" data-seg="buy-leads"><b>I just want to buy leads</b><span>Exclusive, never-resold leads from sites we own.</span></button>'
      + '</div>';
  }

  function goIntro() {
    render(screenIntro());
    Array.prototype.forEach.call(panel.querySelectorAll('.pmcw-chip'), function (c) {
      c.addEventListener('click', function () { goChat(c.getAttribute('data-seg')); });
    });
  }

  function goChat(seg) {
    state.segment = seg; state.messages = []; state.done = false; state.busy = false;
    render('<div class="pmcw-thread" id="pmcw-thread"></div>'
      + '<div class="pmcw-inputrow"><textarea id="pmcw-in" rows="1" placeholder="Type your answer…" aria-label="Your message"></textarea>'
      + '<button id="pmcw-go" type="button">Send</button></div>', true);
    var go = document.getElementById('pmcw-go'), inp = document.getElementById('pmcw-in');
    go.addEventListener('click', sendUser);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendUser(); } });
    inp.addEventListener('input', function () { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 90) + 'px'; });
    fetchTurn();   // initial turn — the worker sends the opener for this segment
  }

  function bubble(role, text) {
    var t = document.getElementById('pmcw-thread'); if (!t) return;
    var d = document.createElement('div');
    d.className = 'pmcw-b ' + (role === 'user' ? 'me' : 'bot');
    d.innerHTML = linkify(esc(text));
    t.appendChild(d); t.scrollTop = t.scrollHeight;
  }
  function typing(on) {
    var t = document.getElementById('pmcw-thread'); if (!t) return;
    var ex = document.getElementById('pmcw-typing'); if (ex) ex.remove();
    if (on) { var d = document.createElement('div'); d.className = 'pmcw-typing'; d.id = 'pmcw-typing';
      d.innerHTML = '<i></i><i></i><i></i>'; t.appendChild(d); t.scrollTop = t.scrollHeight; }
  }
  function setBusy(b) {
    state.busy = b;
    var go = document.getElementById('pmcw-go'), inp = document.getElementById('pmcw-in');
    if (go) go.disabled = b; if (inp) inp.disabled = b;
    if (!b && inp) inp.focus();
  }
  function lockInput() {
    var row = panel.querySelector('.pmcw-inputrow');
    if (row) row.innerHTML = '<a class="pmcw-call" style="flex:1;text-align:center" href="tel:' + CONFIG.PHONE_TEL + '">Call ' + esc(CONFIG.PHONE_DISPLAY) + '</a>';
  }

  function sendUser() {
    var inp = document.getElementById('pmcw-in'); if (!inp || state.busy || state.done) return;
    var text = inp.value.trim(); if (!text) return;
    inp.value = ''; inp.style.height = '42px';
    state.messages.push({ role: 'user', content: text });
    bubble('user', text);
    fetchTurn();
  }

  function fetchTurn() {
    setBusy(true); typing(true);
    fetch(CONFIG.CHAT_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site: CONFIG.SITE, segment: state.segment, messages: state.messages })
    }).then(function (r) { return r.json(); }).then(function (d) {
      typing(false);
      var reply = (d && d.reply) ? d.reply : ("Sorry — I hit a snag. Call us at " + CONFIG.PHONE_DISPLAY + ".");
      state.messages.push({ role: 'assistant', content: reply });
      bubble('bot', reply);
      if (d && (d.done || d.captured)) { state.done = true; lockInput(); }
      else { setBusy(false); }
      try { if ((d && (d.done || d.captured)) && window.gtag) window.gtag('event', 'generate_lead', { event_category: 'chat_widget', event_label: state.segment }); } catch (e) {}
    }).catch(function () {
      typing(false);
      bubble('bot', "Network hiccup — call us at " + CONFIG.PHONE_DISPLAY + ", or try again.");
      setBusy(false);
    });
  }

  function open() { panel.classList.add('pmcw-open'); btn.style.display = 'none'; }
  function close() { panel.classList.remove('pmcw-open'); btn.style.display = ''; }

  btn.addEventListener('click', function () { open(); if (CONFIG.SITE === 'procuremedia.com') goIntro(); else goChat('intake'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('pmcw-open')) close(); });
})();
