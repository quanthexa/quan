
(function(){
  const QX_CACHE = '?v=' + Date.now();
  const pageName = (location.pathname.split('/').pop() || 'index.html').replace('.html','') || 'index';
  const normalizedPage = pageName === '' ? 'index' : pageName;
  let qxCloudContent = null;

  async function loadCloudContent(){
    try{
      const res = await fetch('/api/content?v=' + Date.now(), {cache:'no-store'});
      if(!res.ok) return null;
      const data = await res.json();
      qxCloudContent = data && data.content ? data.content : null;
      return qxCloudContent;
    }catch(e){ return null; }
  }

  function cloudForPath(path){
    if(!qxCloudContent) return null;
    if(path === '/content/global.json') return qxCloudContent.global || null;
    if(path === '/content/theme.json') return qxCloudContent.theme || null;
    if(path === '/content/images.json') return qxCloudContent.images || null;
    if(path === '/content/services.json') return qxCloudContent.services || null;
    const m = path.match(/^\/content\/pages\/([^/]+)\.json$/);
    if(m && qxCloudContent.pages) return qxCloudContent.pages[m[1]] || null;
    return null;
  }

  async function fetchJson(path){
    const cloudValue = cloudForPath(path);
    if(cloudValue) return cloudValue;
    const res = await fetch(path + QX_CACHE, {cache:'no-store'});
    if(!res.ok) throw new Error(path + ' not found');
    return res.json();
  }

  function insertStyle(id, css){
    if(!css || !String(css).trim()) return;
    let tag=document.getElementById(id);
    if(!tag){ tag=document.createElement('style'); tag.id=id; document.head.appendChild(tag); }
    tag.textContent=css;
  }

  function insertHtml(position, id, html){
    if(!html || !String(html).trim()) return;
    const old=document.getElementById(id); if(old) old.remove();
    const wrap=document.createElement('div'); wrap.id=id; wrap.innerHTML=html;
    if(position==='head') document.head.appendChild(wrap);
    else if(position==='bodyStart') document.body.prepend(wrap);
    else document.body.appendChild(wrap);
  }

  function applyCssVars(theme){
    if(!theme) return;
    const css=[];
    // The original theme uses --green / --acid. Keep compatibility with all names.
    if(theme.accent_color){ css.push(`--green:${theme.accent_color}`); css.push(`--accent:${theme.accent_color}`); }
    if(theme.accent_soft){ css.push(`--acid:${theme.accent_soft}`); css.push(`--accent-soft:${theme.accent_soft}`); }
    if(theme.background_color) css.push(`--bg:${theme.background_color}`);
    if(theme.text_color) css.push(`--text:${theme.text_color}`);
    if(theme.muted_text_color) css.push(`--muted:${theme.muted_text_color}`);
    if(theme.card_radius) css.push(`--radius:${theme.card_radius}`);
    if(css.length) document.documentElement.setAttribute('style',(document.documentElement.getAttribute('style')||'') + ';' + css.join(';'));
    if(theme.matrix_enabled === false){ const c=document.getElementById('matrixCanvas'); if(c) c.style.display='none'; }
    if(theme.matrix_opacity !== undefined){ const c=document.getElementById('matrixCanvas'); if(c) c.style.opacity=String(theme.matrix_opacity); }
    if(theme.preloader_enabled === false){ const p=document.getElementById('qx-preloader'); if(p) p.remove(); }
    if(theme.cursor_enabled === false){ document.body.classList.add('qx-no-custom-cursor'); }
    if(theme.ui_sounds_enabled === false){ document.body.classList.add('qx-no-ui-sounds'); }
    insertStyle('qx-theme-custom-css', theme.custom_css || '');
  }

  function applyText(selector, value){
    if(value === undefined || value === null) return;
    document.querySelectorAll(selector).forEach(el=>{ el.textContent = value; });
  }

  const QX_DEFAULTS = {
    company_name: ['QUANTHEXA','QuantHexa'],
    domain: ['quanthexa.online','QUANTHEXA.ONLINE'],
    email: ['contact@quanthexa.online','contact@quanthexa.shop','info@quanthexa.it.com'],
    phone: ['+33574251852','+33 574251852','+33 5 74 25 18 52','+44 7988 510023'],
    address: ['60 RUE FRANCOIS IER, 75008 PARIS','60 rue François 1er, 75008 Paris, France','60 RUE FRANCOIS IER, 75008 PARIS, FRANCE'],
    siren: ['101 651 925','101651925']
  };

  function escapeRegExp(str){ return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function renderTemplate(text, global){
    return String(text ?? '')
      .replace(/\{company_name\}/g, global.company_name || '')
      .replace(/\{domain\}/g, global.domain || '')
      .replace(/\{email\}/g, global.email || '')
      .replace(/\{phone\}/g, global.phone || '')
      .replace(/\{address\}/g, global.address || '')
      .replace(/\{siren\}/g, global.siren || '');
  }

  function replaceLiteralText(global){
    const replacements = [
      [QX_DEFAULTS.company_name, global.company_name],
      [QX_DEFAULTS.domain, global.domain],
      [QX_DEFAULTS.email, global.email],
      [QX_DEFAULTS.phone, global.phone],
      [QX_DEFAULTS.address, global.address],
      [QX_DEFAULTS.siren, global.siren]
    ].filter(([,to]) => to !== undefined && to !== null && String(to).trim() !== '');

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node){
        const parent = node.parentElement;
        if(!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName ? parent.tagName.toLowerCase() : '';
        if(['script','style','textarea','input','select','option'].includes(tag)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      let text=node.nodeValue;
      replacements.forEach(([fromList,to])=>{
        fromList.forEach(from=>{ text = text.replace(new RegExp(escapeRegExp(from),'g'), String(to)); });
      });
      node.nodeValue=text;
    });

    document.querySelectorAll('a[href]').forEach(a=>{
      const href=a.getAttribute('href') || '';
      if(global.email && href.startsWith('mailto:')) a.setAttribute('href','mailto:' + global.email);
      if(global.phone && href.startsWith('tel:')) a.setAttribute('href','tel:' + String(global.phone).replace(/\s+/g,''));
    });
  }

  function renderHeader(global){
    if(global.header_html_enabled && global.header_html){
      const current=document.querySelector('header');
      if(current) current.outerHTML=global.header_html;
      return;
    }
    const topbar=document.querySelector('.topbar-signal-inner');
    if(topbar && Array.isArray(global.topbar_items)){
      topbar.innerHTML = global.topbar_items.map(item=>`<span>${renderTemplate((item && item.text) ? item.text : item, global)}</span>`).join('');
    }
    document.querySelectorAll('.brand-symbol').forEach(img=>{ if(global.logo_symbol) img.src=global.logo_symbol; });
    document.querySelectorAll('.brand-wordmark').forEach(img=>{ if(global.logo_wordmark) img.src=global.logo_wordmark; });
    const nav=document.querySelector('.navlinks');
    if(nav && Array.isArray(global.navigation)){
      nav.innerHTML=global.navigation.map(link=>`<a class="${link.style==='button'?'btn btn-cta-hacker':''}" href="${renderTemplate(link.url||'#', global)}">${renderTemplate(link.label||'Link', global)}</a>`).join('');
    }
  }

  function renderFooter(global){
    if(global.footer_html_enabled && global.footer_html){
      const current=document.querySelector('footer');
      if(current) current.outerHTML=global.footer_html;
      return;
    }
    const footer=document.querySelector('footer .footer-grid');
    if(footer){
      const links=(global.footer_links||[]).map(link=>`<a href="${renderTemplate(link.url||'#', global)}">${renderTemplate(link.label||'Link', global)}</a>`).join('');
      footer.innerHTML=`<div><b>${global.company_name||''}</b><br>${global.footer_slogan||''}<br><span class="micro">SIREN <span data-site-siren>${global.siren||''}</span> · <span data-site-address>${global.address||''}</span></span><br><span class="micro"><span data-site-phone>${global.phone||''}</span> · <span data-site-email>${global.email||''}</span></span></div><div class="footer-links">${links}</div>`;
    }
  }


  function safeSrc(value){
    if(!value) return '';
    return String(value).trim();
  }

  function setImage(selector, src, alt){
    src = safeSrc(src);
    if(!src) return;
    document.querySelectorAll(selector).forEach(el=>{
      if(el.tagName && el.tagName.toLowerCase()==='img'){
        el.src = src;
        if(alt) el.alt = alt;
      } else {
        el.style.backgroundImage = `url("${src}")`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
      }
    });
  }

  function setBackground(selector, src){
    src = safeSrc(src);
    if(!src) return;
    document.querySelectorAll(selector).forEach(el=>{
      el.style.backgroundImage = `url("${src}")`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
    });
  }

  async function applyImages(){
    try{
      const images = await fetchJson('/content/images.json');
      setImage('.brand-symbol', images.logo_symbol, 'Logo symbol');
      setImage('.brand-wordmark', images.logo_wordmark, 'Logo wordmark');
      const favs = [
        ['link[rel="icon"]', images.favicon],
        ['link[sizes="32x32"]', images.favicon_32 || images.favicon],
        ['link[rel="apple-touch-icon"]', images.apple_touch_icon || images.favicon]
      ];
      favs.forEach(([selector, src])=>{ if(!src) return; document.querySelectorAll(selector).forEach(l=>{ l.href=src; }); });
      if(images.hero_background_image) setBackground('.hero,.page-hero', images.hero_background_image);
      if(images.matrix_background_image) setBackground('#matrixCanvas,.matrix-bg,.noise', images.matrix_background_image);
      if(images.page_background_image) setBackground('body', images.page_background_image);
      const pairs = [
        ['cybersecurity-infrastructure', images.cybersecurity_image, 'Cybersecurity & Infrastructure'],
        ['ai-automation-workflows', images.ai_automation_image, 'AI Automation & Workflows'],
        ['cloud-devops-solutions', images.cloud_devops_image, 'Cloud & DevOps Solutions'],
        ['data-analytics-monitoring', images.data_monitoring_image, 'Data Analytics & Monitoring'],
        ['api-integrations-connectivity', images.api_integrations_image, 'API Integrations & Connectivity'],
        ['managed-support-maintenance', images.support_maintenance_image, 'Managed Support & Maintenance']
      ];
      pairs.forEach(([needle, src, alt])=>{
        if(!src) return;
        document.querySelectorAll(`img[src*="${needle}"]`).forEach(img=>{ img.src=src; img.alt=alt; });
      });
      if(Array.isArray(images.custom_image_rules)){
        images.custom_image_rules.forEach(rule=>{
          if(!rule || !rule.selector || !rule.src) return;
          if(rule.mode === 'background') setBackground(rule.selector, rule.src);
          else setImage(rule.selector, rule.src, rule.alt || '');
        });
      }
    }catch(e){ console.warn('Image CMS content not loaded', e); }
  }

  async function applyGlobal(){
    try{
      const global=await fetchJson('/content/global.json');
      document.title = document.title.replace(/QUANTHEXA/g, global.company_name || 'QUANTHEXA');
      const fav=document.querySelector('link[rel="icon"]') || document.createElement('link');
      fav.rel='icon'; if(global.favicon) fav.href=global.favicon; if(!fav.parentNode) document.head.appendChild(fav);
      applyText('[data-company-name]', global.company_name);
      applyText('[data-domain]', global.domain);
      applyText('[data-site-email]', global.email);
      applyText('[data-site-phone]', global.phone);
      applyText('[data-site-address]', global.address);
      applyText('[data-site-siren]', global.siren);
      document.querySelectorAll('a[data-site-email]').forEach(a=>{ a.href='mailto:' + global.email; });
      document.querySelectorAll('a[data-site-phone]').forEach(a=>{ a.href='tel:' + String(global.phone||'').replace(/\s+/g,''); });
      renderHeader(global);
      renderFooter(global);
      insertStyle('qx-global-custom-css', global.custom_css || '');
      insertHtml('head','qx-custom-head-html',global.custom_head_html || '');
      insertHtml('bodyStart','qx-custom-body-start-html',global.custom_body_start_html || '');
      insertHtml('bodyEnd','qx-custom-body-end-html',global.custom_body_end_html || '');
      replaceLiteralText(global);
    }catch(e){ console.warn('Global CMS content not loaded', e); }
  }

  async function applyTheme(){
    try{ applyCssVars(await fetchJson('/content/theme.json')); }catch(e){ console.warn('Theme CMS content not loaded', e); }
  }

  function initDynamicBehavior(){
    document.querySelectorAll('[data-service]').forEach(btn=>{
      btn.addEventListener('click',()=>{ try{localStorage.setItem('service',btn.dataset.service || btn.textContent.trim());}catch(e){} location.href='request.html'; });
    });
    const chosen=document.getElementById('chosenService');
    if(chosen){ try{ if(localStorage.getItem('service')) chosen.value=localStorage.getItem('service'); }catch(e){} }
    const form=document.getElementById('requestForm');
    if(form && !form.dataset.qxBound){
      form.dataset.qxBound='true';
      form.addEventListener('submit',e=>{e.preventDefault(); const s=document.querySelector('.success'); if(s) s.classList.add('show'); form.reset(); scrollTo({top:0,behavior:'smooth'});});
    }
    document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
  }

  async function applyPage(){
    try{
      const page=await fetchJson('/content/pages/' + normalizedPage + '.json');
      if(page.page_title) document.title = page.page_title;
      if(page.meta_description){
        let meta=document.querySelector('meta[name="description"]');
        if(!meta){ meta=document.createElement('meta'); meta.name='description'; document.head.appendChild(meta); }
        meta.content=page.meta_description;
      }
      if(page.main_html_enabled && page.main_html){
        const main=document.querySelector('main');
        if(main) main.innerHTML=page.main_html;
      }
      insertStyle('qx-page-custom-css', page.custom_css || '');
      if(page.custom_js && String(page.custom_js).trim()){
        const old=document.getElementById('qx-page-custom-js'); if(old) old.remove();
        const script=document.createElement('script'); script.id='qx-page-custom-js'; script.textContent=page.custom_js; document.body.appendChild(script);
      }
      initDynamicBehavior();
    }catch(e){ console.warn('Page CMS content not loaded for '+normalizedPage, e); initDynamicBehavior(); }
  }

  async function applyServices(){
    try{
      const data=await fetchJson('/content/services.json');
      const services=Array.isArray(data.services)?data.services:[];
      if(!services.length) return;
      const apply=(el,service,index)=>{
        if(!el||!service) return;
        const title=el.querySelector('h2,h3');
        const code=el.querySelector('.badge,.service-code,[data-service-code]');
        const price=el.querySelector('.price');
        const desc=el.querySelector('p');
        const btn=el.querySelector('button[data-service],a[data-service]');
        const icon=el.querySelector('.icon');
        if(icon && /^\d+$/.test(icon.textContent.trim())) icon.textContent=String(index+1).padStart(2,'0');
        if(title && service.title) title.textContent=service.title;
        if(code && service.code) code.textContent=service.code;
        if(price && service.price) price.textContent=service.price;
        if(desc && service.description) desc.textContent=service.description;
        if(btn && service.title) btn.setAttribute('data-service', service.title);
      };
      Array.from(document.querySelectorAll('.cards .card')).filter(card=>card.querySelector('.price')).forEach((card,i)=>apply(card,services[i],i));
      Array.from(document.querySelectorAll('.service-lux')).forEach((block,i)=>apply(block,services[i],i));
    }catch(e){ console.warn('Services CMS content not loaded', e); }
  }


  function escapeHtml(str){
    return String(str || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function stripFrontMatter(markdown){
    let text = String(markdown || '').replace(/\r\n/g, '\n');
    let title = '';
    if(text.startsWith('---')){
      const end = text.indexOf('\n---', 3);
      if(end !== -1){
        const fm = text.slice(3, end).trim();
        text = text.slice(end + 4).trim();
        const m = fm.match(/^title:\s*["']?(.+?)["']?\s*$/m);
        if(m) title = m[1].trim();
      }
    }
    return { title, body: text.trim() };
  }

  function markdownToHtml(markdown){
    const lines = String(markdown || '').replace(/\r\n/g,'\n').split('\n');
    let html = '';
    let paragraph = [];
    let listOpen = false;
    const flushParagraph = () => {
      if(paragraph.length){
        html += '<p>' + paragraph.join(' ').trim() + '</p>';
        paragraph = [];
      }
    };
    const closeList = () => { if(listOpen){ html += '</ul>'; listOpen = false; } };
    lines.forEach(raw => {
      const line = raw.trim();
      if(!line){ flushParagraph(); closeList(); return; }
      if(/^###\s+/.test(line)){ flushParagraph(); closeList(); html += '<h3>' + escapeHtml(line.replace(/^###\s+/,'')) + '</h3>'; return; }
      if(/^##\s+/.test(line)){ flushParagraph(); closeList(); html += '<h2>' + escapeHtml(line.replace(/^##\s+/,'')) + '</h2>'; return; }
      if(/^#\s+/.test(line)){ flushParagraph(); closeList(); html += '<h1>' + escapeHtml(line.replace(/^#\s+/,'')) + '</h1>'; return; }
      if(/^[-*]\s+/.test(line)){
        flushParagraph();
        if(!listOpen){ html += '<ul>'; listOpen = true; }
        html += '<li>' + escapeHtml(line.replace(/^[-*]\s+/,'')) + '</li>';
        return;
      }
      paragraph.push(escapeHtml(line));
    });
    flushParagraph();
    closeList();
    return html;
  }

  async function applyLegalMarkdown(){
    const legalMap = { privacy: 'privacy', refund: 'refund', terms: 'terms' };
    const key = legalMap[normalizedPage];
    if(!key) return;
    try{
      let legalText = qxCloudContent && qxCloudContent.legal && qxCloudContent.legal[key];
      if(!legalText){
        const response = await fetch('/content/' + key + '.md', { cache: 'no-cache' });
        if(!response.ok) throw new Error('Legal markdown not found');
        legalText = await response.text();
      }
      const parsed = stripFrontMatter(legalText);
      const article = document.querySelector('article.legal, .panel.legal, .policy-page');
      if(article && parsed.body){
        article.innerHTML = markdownToHtml(parsed.body);
      }
      const displayTitle = parsed.title || (key === 'terms' ? 'Terms of Service' : key === 'refund' ? 'Refund Policy' : 'Privacy Policy');
      if(displayTitle){
        const heroTitle = document.querySelector('.page-hero h1');
        if(heroTitle) heroTitle.textContent = displayTitle;
        const articleTitle = article && article.querySelector('h1,h2');
        if(articleTitle && articleTitle.textContent.trim().toLowerCase() !== displayTitle.toLowerCase()){
          // Keep markdown heading if present; do not duplicate it.
        }
        document.title = displayTitle + ' · ' + (document.querySelector('[data-company-name]')?.textContent || 'QUANTHEXA');
      }
      initDynamicBehavior();
    }catch(e){ console.warn('Legal markdown CMS content not loaded for '+normalizedPage, e); }
  }


  document.addEventListener('DOMContentLoaded', async()=>{
    await loadCloudContent();
    // Order matters: load page content first, then apply global values so
    // contacts/brand/footer changes also update text inside editable pages.
    await applyTheme();
    await applyPage();
    await applyLegalMarkdown();
    await applyServices();
    await applyGlobal();
    await applyImages();
    await applyServices();
    initDynamicBehavior();
  });
})();
