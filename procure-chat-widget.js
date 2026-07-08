/*!
 * Procure Media — site chat-to-capture widget
 * -------------------------------------------------------------
 * What it does: a floating chat bubble that captures a visitor's name + phone
 * (+ optional email / note), posts the lead to the Procure lead engine (the same
 * /submit endpoint the site's forms already use), notifies you, and confirms in-widget.
 *
 * SMS is intentionally OFF until the (855) 754-5015 toll-free SMS number is approved.
 * When it clears, set CONFIG.SMS_ENABLED = true (one line) — that turns on the SMS
 * consent checkbox and the "we just texted you" confirmation. The 24/7 AI-SMS reply
 * agent is the worker side (separate, gated deploy) that activates on the same approval.
 *
 * Self-contained: no dependencies, no external calls except the lead POST. Namespaced
 * styles (.pmcw-*). Safe to include once per page.
 *
 * Intro options mirror the homepage "Which best describes you?" funnel (small business /
 * large sales org / buy leads) so the chat and the form ask the same first question.
 * -------------------------------------------------------------
 */
(function () {
  if (window.__pmChatWidget) return;            // guard against double-include
  window.__pmChatWidget = true;

  var CONFIG = {
    ENDPOINT: 'https://procure-lead-engine.dan-fda.workers.dev/submit',
    LEAD_SOURCE: 'procuremedia.com',
    PHONE_DISPLAY: '(855) 754-5015',
    PHONE_TEL: '+18557545015',
    SIGNUP_URL: 'https://signup.procuremedia.com/',
    CONSENT_VERSION: 'pm-sms-v1-2026-07-06',
    SMS_ENABLED: false   // <-- flip to true AFTER the (855) toll-free SMS is approved
  };

  // ---- brand tokens (match procuremedia.com; explicit hex so it works on any page) ----
  var C = { navy:'#0B3558', navyDark:'#07253D', gold:'#F4A621', goldDark:'#D88D13',
            text:'#142132', muted:'#6E7A8A', line:'#E5EBF2', light:'#F7F9FC' };

  var css = [
    '.pmcw-btn{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:flex;align-items:center;gap:10px;',
      'background:'+C.gold+';color:#111;border:none;border-radius:999px;padding:14px 20px;font:800 15px/1 Inter,system-ui,sans-serif;',
      'cursor:pointer;box-shadow:0 10px 28px rgba(11,53,88,.28);transition:transform .18s ease,background .18s ease;}',
    '.pmcw-btn:hover{background:'+C.goldDark+';transform:translateY(-2px);}',
    '.pmcw-btn svg{width:20px;height:20px;display:block;}',
    '@media(max-width:520px){.pmcw-btn{right:14px;bottom:14px;padding:13px 16px;}.pmcw-btn .pmcw-btxt{display:none;}}',
    '.pmcw-panel{position:fixed;right:20px;bottom:20px;z-index:2147483001;width:360px;max-width:calc(100vw - 32px);',
      'max-height:min(620px,calc(100vh - 32px));display:none;flex-direction:column;background:#fff;border-radius:18px;overflow:hidden;',
      'box-shadow:0 24px 60px rgba(7,37,61,.30);font:400 15px/1.5 Inter,system-ui,sans-serif;color:'+C.text+';}',
    '.pmcw-panel.pmcw-open{display:flex;animation:pmcw-in .18s ease;}',
    '@keyframes pmcw-in{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}',
    '@media(max-width:520px){.pmcw-panel{right:8px;left:8px;bottom:8px;width:auto;max-height:calc(100vh - 16px);}}',
    '.pmcw-head{background:linear-gradient(160deg,'+C.navy+' 0%,'+C.navyDark+' 100%);color:#fff;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;}',
    '.pmcw-head h3{margin:0;font:800 16px/1.2 Inter,sans-serif;}',
    '.pmcw-head p{margin:3px 0 0;font-size:12.5px;color:#D3DCE7;}',
    '.pmcw-x{background:rgba(255,255,255,.12);border:none;color:#fff;width:30px;height:30px;border-radius:8px;font-size:18px;cursor:pointer;line-height:1;}',
    '.pmcw-x:hover{background:rgba(255,255,255,.22);}',
    '.pmcw-body{padding:18px;overflow-y:auto;}',
    '.pmcw-msg{background:'+C.light+';border:1px solid '+C.line+';border-radius:14px;padding:12px 14px;margin-bottom:14px;font-size:14.5px;}',
    '.pmcw-chips{display:flex;flex-direction:column;gap:9px;}',
    '.pmcw-chip{text-align:left;background:#fff;border:1.5px solid '+C.line+';border-radius:12px;padding:13px 15px;font:700 14.5px Inter,sans-serif;color:'+C.navy+';cursor:pointer;transition:.15s;}',
    '.pmcw-chip:hover{border-color:'+C.gold+';background:'+C.light+';transform:translateY(-1px);}',
    '.pmcw-chip b{display:block;font-weight:800;}',
    '.pmcw-chip span{display:block;margin-top:3px;font-weight:500;font-size:12px;color:'+C.muted+';}',
    '.pmcw-field{margin-bottom:11px;}',
    '.pmcw-field label{display:block;font:700 12.5px Inter,sans-serif;color:'+C.navy+';margin-bottom:5px;}',
    '.pmcw-field .pmcw-opt{color:'+C.muted+';font-weight:500;}',
    '.pmcw-field input,.pmcw-field textarea{width:100%;border:1.5px solid '+C.line+';border-radius:10px;padding:11px 12px;font:400 15px Inter,sans-serif;color:'+C.text+';background:#fff;}',
    '.pmcw-field input:focus,.pmcw-field textarea:focus{outline:none;border-color:'+C.gold+';box-shadow:0 0 0 3px rgba(244,166,33,.16);}',
    '.pmcw-field textarea{resize:vertical;min-height:58px;}',
    '.pmcw-consent{display:flex;gap:8px;align-items:flex-start;font-size:11.5px;color:'+C.muted+';margin:6px 0 12px;line-height:1.45;}',
    '.pmcw-consent input{margin-top:2px;}',
    '.pmcw-fine{font-size:11px;color:'+C.muted+';margin-top:10px;line-height:1.45;}',
    '.pmcw-fine a{color:'+C.navy+';text-decoration:underline;}',
    '.pmcw-send{width:100%;background:'+C.gold+';color:#111;border:none;border-radius:12px;padding:14px;font:800 15px Inter,sans-serif;cursor:pointer;transition:.18s;}',
    '.pmcw-send:hover{background:'+C.goldDark+';transform:translateY(-1px);}',
    '.pmcw-send[disabled]{opacity:.6;cursor:progress;transform:none;}',
    '.pmcw-ok{text-align:center;padding:8px 4px;}',
    '.pmcw-ok .pmcw-tick{width:52px;height:52px;border-radius:50%;background:'+C.light+';border:2px solid '+C.gold+';color:'+C.goldDark+';display:flex;align-items:center;justify-content:center;margin:4px auto 14px;font-size:26px;}',
    '.pmcw-ok h4{margin:0 0 8px;font:800 17px Inter,sans-serif;color:'+C.navy+';}',
    '.pmcw-ok p{margin:0 0 16px;font-size:14.5px;color:'+C.text+';}',
    '.pmcw-call{display:inline-block;background:'+C.navy+';color:#fff;border-radius:11px;padding:12px 20px;font:800 14.5px Inter,sans-serif;}',
    '.pmcw-start{display:block;margin-top:10px;color:'+C.navy+';font-weight:700;text-decoration:underline;font-size:13.5px;}',
    '.pmcw-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;}',
    '@media(prefers-reduced-motion:reduce){.pmcw-btn,.pmcw-panel,.pmcw-chip,.pmcw-send{transition:none;animation:none;}}'
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

  // ---- panel ----
  var panel = document.createElement('div');
  panel.className = 'pmcw-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Chat with Procure Media');
  panel.setAttribute('aria-modal', 'false');
  document.addEventListener('DOMContentLoaded', mount);
  if (document.readyState !== 'loading') mount();

  function mount() {
    if (!document.body || btn.parentNode) return;
    document.body.appendChild(btn);
    document.body.appendChild(panel);
  }

  var state = { segment: '', name: '', phone: '', email: '', message: '' };

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  function render(screen) {
    var h = ''
      + '<div class="pmcw-head"><div><h3>Chat with Procure Media</h3><p>We reply fast — usually within minutes.</p></div>'
      + '<button class="pmcw-x" aria-label="Close chat">&times;</button></div>'
      + '<div class="pmcw-body">' + screen + '</div>';
    panel.innerHTML = h;
    panel.querySelector('.pmcw-x').addEventListener('click', close);
  }

  // Intro question + options mirror the homepage "Which best describes you?" funnel.
  function screenIntro() {
    return '<div class="pmcw-msg">Which best describes you?</div>'
      + '<div class="pmcw-chips">'
      + '<button class="pmcw-chip" data-seg="get-customers"><b>I run a small business and need more customers</b><span>I\'m an independent business and need to stop missing calls and leads.</span></button>'
      + '<button class="pmcw-chip" data-seg="enterprise"><b>I run a large sales organization</b><span>I need an all-inclusive platform for my whole sales team.</span></button>'
      + '<button class="pmcw-chip" data-seg="buy-leads"><b>I just want to buy leads</b><span>Exclusive, never-resold leads from sites we own.</span></button>'
      + '</div>';
  }

  function screenForm() {
    var smsBlock = CONFIG.SMS_ENABLED
      ? '<label class="pmcw-consent"><input type="checkbox" id="pmcw-sms"><span>Yes, text me about my request. Msg &amp; data rates may apply; message frequency varies. Reply STOP to opt out.</span></label>'
      : '';
    return '<div class="pmcw-msg">Great — where should we reach you?</div>'
      + '<div class="pmcw-field"><label for="pmcw-name">Name</label><input id="pmcw-name" type="text" autocomplete="name"></div>'
      + '<div class="pmcw-field"><label for="pmcw-phone">Phone</label><input id="pmcw-phone" type="tel" autocomplete="tel"></div>'
      + '<div class="pmcw-field"><label for="pmcw-email">Email <span class="pmcw-opt">(optional)</span></label><input id="pmcw-email" type="email" autocomplete="email"></div>'
      + '<div class="pmcw-field"><label for="pmcw-note">Anything that helps us route you <span class="pmcw-opt">(optional)</span></label><textarea id="pmcw-note" placeholder="Vertical, area, volume, # of agents/locations…"></textarea></div>'
      + '<input class="pmcw-hp" type="text" id="pmcw-gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">'
      + smsBlock
      + '<button class="pmcw-send" id="pmcw-send">Send</button>'
      + '<p class="pmcw-fine">By submitting, you agree to be contacted about your request by Procure Media, LLC by phone and email. Consent is not a condition of purchase. See our <a href="/privacy-policy.html">Privacy Policy</a> and <a href="/terms.html">Terms</a>.</p>';
  }

  function screenSuccess(name) {
    var first = (name || '').trim().split(' ')[0];
    var hi = first ? esc(first) + ', ' : '';
    var line = CONFIG.SMS_ENABLED
      ? 'We just texted you — reply anytime, or call us now.'
      : "We've got it and we'll reach out shortly. Prefer to talk now?";
    var start = state.segment === 'get-customers'
      ? '<a class="pmcw-start" href="' + CONFIG.SIGNUP_URL + '">Ready to start now? Set up your $99 account &rarr;</a>' : '';
    return '<div class="pmcw-ok"><div class="pmcw-tick">&#10003;</div>'
      + '<h4>Thanks, ' + hi + 'you\'re all set</h4>'
      + '<p>' + line + '</p>'
      + '<a class="pmcw-call" href="tel:' + CONFIG.PHONE_TEL + '">Call ' + esc(CONFIG.PHONE_DISPLAY) + '</a>'
      + start + '</div>';
  }

  function goIntro() {
    render(screenIntro());
    Array.prototype.forEach.call(panel.querySelectorAll('.pmcw-chip'), function (c) {
      c.addEventListener('click', function () { state.segment = c.getAttribute('data-seg'); goForm(); });
    });
  }

  function goForm() {
    render(screenForm());
    var send = panel.querySelector('#pmcw-send');
    send.addEventListener('click', submit);
    var nm = panel.querySelector('#pmcw-name'); if (nm) nm.focus();
    panel.querySelector('#pmcw-note').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
    });
  }

  function submit() {
    var v = function (id) { var el = panel.querySelector(id); return el ? el.value.trim() : ''; };
    if (v('#pmcw-gotcha')) { close(); return; }            // honeypot tripped
    state.name = v('#pmcw-name'); state.phone = v('#pmcw-phone');
    state.email = v('#pmcw-email'); state.message = v('#pmcw-note');
    if (!state.name || state.phone.replace(/\D/g, '').length < 7) {
      var bad = !state.name ? '#pmcw-name' : '#pmcw-phone';
      var el = panel.querySelector(bad); if (el) { el.style.borderColor = '#B42318'; el.focus(); }
      return;
    }
    var btnEl = panel.querySelector('#pmcw-send');
    btnEl.setAttribute('disabled', 'disabled'); btnEl.textContent = 'Sending…';

    var params = {
      lead_source: CONFIG.LEAD_SOURCE,
      segment: 'webchat:' + state.segment,
      name: state.name, phone: state.phone, email: state.email,
      message: state.message, consent_version: CONFIG.CONSENT_VERSION, _gotcha: ''
    };
    var smsBox = panel.querySelector('#pmcw-sms');
    if (CONFIG.SMS_ENABLED && smsBox && smsBox.checked) params.sms_consent = 'yes';

    var body = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');

    fetch(CONFIG.ENDPOINT, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: body
    }).then(done).catch(done);

    try { if (window.gtag) window.gtag('event', 'generate_lead', { event_category: 'chat_widget', event_label: state.segment }); } catch (e) {}
  }

  function done() { render(screenSuccess(state.name)); panel.querySelector('.pmcw-x').addEventListener('click', close); }

  function open() { panel.classList.add('pmcw-open'); btn.style.display = 'none'; if (!panel.querySelector('.pmcw-body')) goIntro(); else if (!panel.querySelector('.pmcw-ok')) goIntro(); }
  function close() { panel.classList.remove('pmcw-open'); btn.style.display = ''; }

  btn.addEventListener('click', function () { goIntro(); open(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('pmcw-open')) close(); });
})();
