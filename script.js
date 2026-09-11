(function(){
  "use strict";

  // ============================================================
  // Theme engine — driven by Bangladesh (Asia/Dhaka) clock, not OS.
  // 06:00–18:00 Dhaka time = light. Otherwise = dark.
  // A manual click overrides for this browser tab only (sessionStorage);
  // the automatic schedule resumes on the next visit.
  // ============================================================
  var THEME_KEY = 'theme_override';

  function dhakaHour(){
    // Asia/Dhaka is UTC+6 with no DST — compute directly from UTC epoch.
    var utcMs = Date.now();
    var dhakaMs = utcMs + 6 * 3600000;
    return new Date(dhakaMs).getUTCHours();
  }
  function scheduledTheme(){
    var h = dhakaHour();
    return (h >= 6 && h < 18) ? 'light' : 'dark';
  }
  function applyTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
  }
  function currentTheme(){
    try {
      var override = sessionStorage.getItem(THEME_KEY);
      if (override === 'light' || override === 'dark') return override;
    } catch(e){}
    return scheduledTheme();
  }
  applyTheme(currentTheme());
  // Re-check periodically so a tab left open crosses the 6am/6pm line live.
  setInterval(function(){
    try { if (sessionStorage.getItem(THEME_KEY)) return; } catch(e){}
    applyTheme(scheduledTheme());
  }, 5 * 60 * 1000);

  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle){
    themeToggle.addEventListener('click', function(){
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { sessionStorage.setItem(THEME_KEY, next); } catch(e){}
    });
  }

  // ============================================================
  // Icon set (inline SVG, currentColor) for socials/connect/footer
  // ============================================================
  var ICONS = {
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 6.3A7.9 7.9 0 0 0 12 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.24-1.1a7.9 7.9 0 0 0 3.8.96A7.95 7.95 0 0 0 20 12a7.9 7.9 0 0 0-2.5-5.7zM12 18.5a6.6 6.6 0 0 1-3.37-.92l-.24-.14-2.51.66.67-2.45-.16-.25A6.6 6.6 0 1 1 18.6 12a6.6 6.6 0 0 1-6.6 6.5zm3.6-4.93c-.2-.1-1.17-.58-1.35-.64s-.31-.1-.44.1-.5.64-.61.76-.23.14-.42.05a5.4 5.4 0 0 1-1.6-.99 6 6 0 0 1-1.1-1.37c-.12-.2 0-.31.09-.4s.2-.23.29-.35a1.3 1.3 0 0 0 .2-.33.37.37 0 0 0 0-.35c-.05-.1-.44-1.06-.6-1.45s-.32-.33-.44-.34h-.38a.72.72 0 0 0-.52.24 2.2 2.2 0 0 0-.68 1.63 3.8 3.8 0 0 0 .8 2.03 8.7 8.7 0 0 0 3.33 2.94c.47.2.83.32 1.11.41.47.15.9.13 1.23.08.38-.06 1.17-.48 1.32-.93.16-.46.16-.85.11-.93-.05-.08-.18-.13-.38-.23z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 8.5H4.75v11.25h2.19V8.5zM5.84 4.9A1.27 1.27 0 1 0 5.86 7.4a1.27 1.27 0 0 0-.02-2.5zM20.99 14.24c0-3.81-2.03-5.58-4.75-5.58a4.1 4.1 0 0 0-3.72 2.05h-.05V8.5H10.4c.03.7 0 11.25 0 11.25h2.19v-6.28c0-.34.02-.67.12-.91.27-.67.87-1.36 1.9-1.36 1.34 0 1.87 1.02 1.87 2.52v6.03h2.19v-6.51z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 3.1 2.6 10.7c-.9.35-.9 1.65.02 1.98l4.7 1.7 1.8 5.8c.24.77 1.2.97 1.73.36l2.6-3 4.9 3.6c.7.5 1.7.13 1.87-.72l3.1-15.2c.2-.98-.77-1.77-1.72-1.42zM8.9 14.9l9-6.9c.2-.15.4.1.24.28l-7.4 7.05-.28 3.1-1.4-3.5z"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
    behance: '<svg viewBox="0 0 24 24" fill="none"><text x="12" y="16.5" text-anchor="middle" font-family="Sora,sans-serif" font-weight="700" font-size="11" fill="currentColor">Be</text></svg>',
    website: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 15l6-6M8 12l-2 2a3 3 0 1 0 4 4l1-1M16 12l2-2a3 3 0 1 0-4-4l-1 1"/></svg>'
  };
  function iconFor(type){ return ICONS[type] || ICONS.website; }
  function hrefFor(social){
    if (social.type === 'whatsapp') return 'https://wa.me/' + String(social.value || '').replace(/\D/g,'');
    if (social.type === 'email') return 'mailto:' + (social.value || '');
    return social.url || '#';
  }

  // ---- Fetch data (cache-bust lightly so edits via admin show up soon) ----
  fetch('data.json', { cache: 'no-cache' })
    .then(function(r){ return r.json(); })
    .then(render)
    .catch(function(err){ console.error('Could not load data.json', err); });

  function esc(s){
    if(s == null) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function render(data){
    var p = data.profile || {};
    var socials = data.socials || [];

    document.title = (p.name || 'Portfolio') + ' — Portfolio';
    setText('heroName', p.shortName || p.name || 'there');
    setText('heroSummary', p.summary || '');
    setText('aboutSummary', p.summary || '');
    setText('infoName', p.name || '');
    setText('infoTitle', p.title || '');
    setText('infoLocation', p.location || '');
    setText('infoEmail', p.email || '');
    setText('infoPhone', (p.phones || []).join(' / '));
    setText('footerName', p.name || '');
    setHTML('heroLocation', '📍 ' + esc(p.location || ''));

    var photo = document.getElementById('heroPhoto');
    if (photo && p.photo) photo.src = p.photo;

    // Hero social icon row (small circular icons under the CTA buttons)
    var heroSocials = document.getElementById('heroSocials');
    if (heroSocials){
      socials.forEach(function(s){
        var a = document.createElement('a');
        a.href = hrefFor(s);
        a.setAttribute('aria-label', s.label || s.type);
        if (s.type !== 'email' && s.type !== 'whatsapp') { a.target = '_blank'; a.rel = 'noopener'; }
        a.innerHTML = iconFor(s.type);
        heroSocials.appendChild(a);
      });
    }

    // Rotating title (typewriter-ish)
    var roles = [p.title, 'Motion Video Editor', 'Social Media Marketer', 'Business Owner'].filter(Boolean);
    typeRotate(document.getElementById('heroTitle'), roles);

    // Behance CTA in hero (sourced from socials)
    var behance = socials.filter(function(s){ return s.type === 'behance'; })[0];
    if (behance) setHref('behanceLink', hrefFor(behance));
    else { var bl = document.getElementById('behanceLink'); if (bl) bl.style.display = 'none'; }

    // Primary WhatsApp + Email contact buttons (first whatsapp entry wins)
    var wa = socials.filter(function(s){ return s.type === 'whatsapp'; })[0];
    if (wa) setHref('waLink', hrefFor(wa));
    if (p.email) setHref('emailLink', 'mailto:' + p.email);
    if (p.cv) { setHref('cvLink', p.cv); setHref('navCvLink', p.cv); }
    else { var cl = document.getElementById('cvLink'); if (cl) cl.style.display = 'none';
      var ncl = document.getElementById('navCvLink'); if (ncl) ncl.style.display = 'none'; }

    // Achievements
    var ACHIEVE_ICONS = {
      briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5"/><path d="M3 12.5h18"/></svg>',
      people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17.5" cy="9" r="2.4"/><path d="M15.7 14.7c2.6.3 4.3 2.2 4.3 5.3"/></svg>',
      rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 9.5c2.5-2.5 5-3 6.5-2.5.5 1.5 0 4-2.5 6.5l-2 6-2.5-2.5-2.5-2.5z"/><path d="M9.5 14.5 3.5 21c1-3.7 1.7-6.3 3-7.6 2-2 5-5 7.5-6.9C17 3.4 20 3 21 3s-.4 4-3.5 7c-1.9 2.5-4.9 5.5-6.9 7.5-1.3 1.3-3.9 2-7.6 3z"/><circle cx="15" cy="9" r="1.4"/></svg>',
      cap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l10-4.5L22 9l-10 4.5L2 9z"/><path d="M6 11.3V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.7"/><path d="M22 9v6"/></svg>'
    };
    var achieveGrid = document.getElementById('achievementsGrid');
    if (achieveGrid){
      var achieveOrder = ['briefcase', 'people', 'rocket', 'cap'];
      (data.achievements || []).forEach(function(a, i){
        var iconKey = a.icon && ACHIEVE_ICONS[a.icon] ? a.icon : (achieveOrder[i] || 'briefcase');
        var tile = document.createElement('div');
        tile.className = 'achieve-card reveal';
        tile.innerHTML = '<div class="achieve-icon">' + ACHIEVE_ICONS[iconKey] + '</div>' +
          '<div class="achieve-value">' + esc(a.value) + '</div><div class="achieve-label">' + esc(a.label) + '</div>';
        achieveGrid.appendChild(tile);
      });
    }

    // Skills
    var skillsGrid = document.getElementById('skillsGrid');
    (data.skills || []).forEach(function(group, i){
      var card = document.createElement('div');
      card.className = 'skill-card reveal';
      card.style.setProperty('--i', i);
      var tags = (group.items || []).map(function(item){
        return '<span class="tag">' + esc(item) + '</span>';
      }).join('');
      card.innerHTML = '<h3>' + esc(group.category) + '</h3><div class="tag-row">' + tags + '</div>';
      skillsGrid.appendChild(card);
    });

    // Experience timeline
    var timeline = document.getElementById('timeline');
    (data.experience || []).forEach(function(job, i){
      var item = document.createElement('div');
      item.className = 'tl-item reveal';
      item.style.setProperty('--i', i);
      var points = (job.points || []).map(function(pt){ return '<li>' + esc(pt) + '</li>'; }).join('');
      item.innerHTML =
        '<div class="tl-role">' + esc(job.role) + '</div>' +
        '<div class="tl-meta"><span>' + esc(job.company) + '</span><span>' + esc(job.period) + '</span></div>' +
        '<ul>' + points + '</ul>';
      timeline.appendChild(item);
    });

    // Education
    var eduGrid = document.getElementById('eduGrid');
    (data.education || []).forEach(function(ed, i){
      var card = document.createElement('div');
      card.className = 'edu-card reveal';
      card.style.setProperty('--i', i);
      card.innerHTML = '<h4>' + esc(ed.degree) + '</h4><p>' + esc(ed.institute) + ' · ' + esc(ed.period) + '</p>';
      eduGrid.appendChild(card);
    });

    // Ventures
    var ventureGrid = document.getElementById('ventureGrid');
    (data.ventures || []).forEach(function(v, i){
      var card = document.createElement('div');
      card.className = 'venture-card reveal';
      card.style.setProperty('--i', i);
      var linkHtml = v.url
        ? '<a class="venture-link" href="' + esc(v.url) + '" target="_blank" rel="noopener">Visit page <span class="arrow">→</span></a>'
        : '<span class="venture-soon">Link coming soon</span>';
      card.innerHTML =
        '<div class="venture-icon">' + (v.icon || '✦') + '</div>' +
        '<h3>' + esc(v.name) + '</h3>' +
        '<p>' + esc(v.description || '') + '</p>' +
        linkHtml;
      ventureGrid.appendChild(card);
      initTilt(card);
    });

    // Work / Projects gallery (folders of images, with a lightbox)
    initWorkGallery(data.projects || []);

    // Connect grid (contact section) + footer mini icons
    var connectGrid = document.getElementById('connectGrid');
    var footerSocial = document.getElementById('footerSocial');
    socials.forEach(function(s, i){
      var href = hrefFor(s);
      var external = !(s.type === 'whatsapp' || s.type === 'email');

      var item = document.createElement('a');
      item.className = 'connect-item reveal';
      item.style.setProperty('--i', i);
      item.href = href;
      if (external){ item.target = '_blank'; item.rel = 'noopener'; }
      item.innerHTML = '<span class="connect-icon">' + iconFor(s.type) + '</span><span class="connect-label">' + esc(s.label || s.type) + '</span>';
      connectGrid.appendChild(item);

      var fIcon = document.createElement('a');
      fIcon.href = href;
      fIcon.setAttribute('aria-label', s.label || s.type);
      if (external){ fIcon.target = '_blank'; fIcon.rel = 'noopener'; }
      fIcon.innerHTML = iconFor(s.type);
      footerSocial.appendChild(fIcon);
    });

    // Marquee ribbon — built from skill categories + a couple of fixed phrases
    var marqueeItems = ['Available for Freelance Work']
      .concat((data.skills || []).map(function(g){ return g.category; }))
      .concat((data.ventures || []).map(function(v){ return v.name; }))
      .filter(Boolean);
    var marqueeTrack = document.getElementById('marqueeTrack');
    if (marqueeTrack && marqueeItems.length){
      var html = marqueeItems.map(function(t){ return '<span class="marquee-item">' + esc(t) + '</span>'; }).join('');
      marqueeTrack.innerHTML = html + html; // duplicate for seamless loop
    }

    document.getElementById('year').textContent = new Date().getFullYear();

    // (Re)initialize scroll-reveal for newly injected nodes
    initReveal();
    wireMailtoFallback();
  }

  // ---- Work / Projects gallery: folder tabs + grid + lightbox ----
  function initWorkGallery(folders){
    var tabsWrap = document.getElementById('folderTabs');
    var grid = document.getElementById('workGrid');
    if (!tabsWrap || !grid) return;
    folders = folders.filter(function(f){ return f && f.folder; });
    if (!folders.length) return;

    var active = 0;
    function renderTabs(){
      tabsWrap.innerHTML = '';
      folders.forEach(function(f, i){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'folder-tab' + (i === active ? ' active' : '');
        btn.textContent = f.folder + ' (' + (f.items || []).length + ')';
        btn.addEventListener('click', function(){ active = i; renderTabs(); renderGrid(); });
        tabsWrap.appendChild(btn);
      });
    }
    var FOLDER_STYLE = {
      'Graphic Design': { icon: 'Ps', grad: 'linear-gradient(135deg,#2f6b45,#0d8f7f)' },
      'Motion Video Editing': { icon: 'Pr', grad: 'linear-gradient(135deg,#c15a2e,#b5721e)' },
      'Visa Documentation Samples': { icon: '📄', grad: 'linear-gradient(135deg,#3a3f2e,#5c5647)' }
    };
    function renderGrid(){
      grid.innerHTML = '';
      var items = (folders[active].items || []);
      if (!items.length){
        var fname = folders[active].folder;
        var style = FOLDER_STYLE[fname] || { icon: '🗂️', grad: 'var(--grad)' };
        var empty = document.createElement('div');
        empty.className = 'work-empty';
        empty.style.background = style.grad;
        empty.innerHTML = '<div class="work-empty-icon">' + style.icon + '</div>' +
          '<div class="work-empty-title">' + esc(fname) + '</div>' +
          '<div class="work-empty-sub">Real pieces coming soon — added via the admin panel.</div>';
        grid.appendChild(empty);
        return;
      }
      items.forEach(function(item){
        var card = document.createElement('div');
        card.className = 'work-card reveal in';
        card.innerHTML = '<img src="' + esc(item.image) + '" alt="' + esc(item.title || '') + '" loading="lazy">' +
          (item.title ? '<figcaption>' + esc(item.title) + '</figcaption>' : '');
        card.addEventListener('click', function(){ openLightbox(item.image, item.title || ''); });
        grid.appendChild(card);
      });
    }
    renderTabs();
    renderGrid();
  }

  function openLightbox(src, caption){
    var lb = document.getElementById('lightbox');
    if (!lb) return;
    document.getElementById('lightboxImg').src = src;
    document.getElementById('lightboxCaption').textContent = caption || '';
    lb.classList.add('open');
  }
  (function setupLightboxClose(){
    var lb = document.getElementById('lightbox');
    if (!lb) return;
    function close(){ lb.classList.remove('open'); }
    document.getElementById('lightboxClose').addEventListener('click', close);
    lb.addEventListener('click', function(e){ if (e.target === lb) close(); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
  })();

  // ---- mailto: fallback — copy the address too, in case no mail app is set up ----
  function showToast(msg){
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(function(){ t.classList.remove('show'); }, 2600);
  }
  function wireMailtoFallback(){
    document.querySelectorAll('a[href^="mailto:"]').forEach(function(a){
      if (a._mailtoWired) return;
      a._mailtoWired = true;
      a.addEventListener('click', function(){
        var addr = a.href.replace(/^mailto:/, '').split('?')[0];
        if (navigator.clipboard && addr){
          navigator.clipboard.writeText(addr).then(function(){
            showToast('Email copied: ' + addr + ' (opening your mail app…)');
          }).catch(function(){});
        }
      });
    });
  }

  function computeYears(experience){
    if (!experience || !experience.length) return 1;
    var years = [];
    experience.forEach(function(e){
      var m = (e.period || '').match(/(20\d{2})/g);
      if (m) m.forEach(function(y){ years.push(parseInt(y,10)); });
    });
    if (!years.length) return 1;
    var min = Math.min.apply(null, years);
    var now = new Date().getFullYear();
    return Math.max(1, now - min);
  }

  function setText(id, val){ var el = document.getElementById(id); if (el) el.textContent = val; }
  function setHTML(id, val){ var el = document.getElementById(id); if (el) el.innerHTML = val; }
  function setHref(id, val){ var el = document.getElementById(id); if (el && val) el.href = val; }

  function typeRotate(el, roles){
    if (!el || !roles.length) return;
    var i = 0, char = 0, deleting = false;
    function tick(){
      var full = roles[i];
      el.textContent = deleting ? full.slice(0, char--) : full.slice(0, char++);
      var delay = deleting ? 28 : 42;
      if (!deleting && char === full.length + 1){ delay = 1500; deleting = true; }
      else if (deleting && char === 0){ deleting = false; i = (i+1) % roles.length; delay = 300; }
      setTimeout(tick, delay);
    }
    tick();
  }

  // ---- Nav scroll state + scroll progress bar + mobile toggle ----
  var nav = document.getElementById('nav');
  var progressBar = document.getElementById('scrollProgress');
  window.addEventListener('scroll', function(){
    if (window.scrollY > 20) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
    if (progressBar){
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      progressBar.style.width = pct + '%';
    }
  }, { passive: true });

  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if (navToggle){
    navToggle.addEventListener('click', function(){ navLinks.classList.toggle('open'); });
    navLinks.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ navLinks.classList.remove('open'); });
    });
  }

  // ---- Scroll reveal ----
  var observer;
  function initReveal(){
    var targets = document.querySelectorAll('.reveal:not(.in)');
    if (!observer){
      observer = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting){
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    }
    targets.forEach(function(t){ observer.observe(t); });
  }
  initReveal();

  // ---- Ambient cursor glow (fine-pointer devices only) ----
  var glow = document.getElementById('cursorGlow');
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (glow && fine && !reduceMotion){
    var raf = null, mx = 0, my = 0;
    window.addEventListener('mousemove', function(e){
      mx = e.clientX; my = e.clientY;
      glow.classList.add('active');
      if (!raf){
        raf = requestAnimationFrame(function(){
          glow.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
          raf = null;
        });
      }
    }, { passive: true });
    document.addEventListener('mouseleave', function(){ glow.classList.remove('active'); });
  }

  // ---- Venture card magnetic tilt (fine-pointer only) ----
  function initTilt(card){
    if (!fine || reduceMotion) return;
    var rect;
    card.addEventListener('pointerenter', function(){ rect = card.getBoundingClientRect(); });
    card.addEventListener('pointermove', function(e){
      if (!rect) rect = card.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;
      var py = (e.clientY - rect.top) / rect.height - 0.5;
      var rotX = (py * -8).toFixed(2);
      var rotY = (px * 10).toFixed(2);
      card.style.transform = 'translateY(-8px) perspective(700px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
    });
    card.addEventListener('pointerleave', function(){ card.style.transform = ''; });
  }
})();
