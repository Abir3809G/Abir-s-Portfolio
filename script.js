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
  // Scroll & motion enhancements (GSAP + ScrollTrigger, loaded via CDN in
  // index.html — normal native browser scrolling, no smooth-scroll library).
  // Every function below checks the library actually
  // loaded before doing anything — if a CDN is blocked or slow, the site
  // simply keeps its existing, guaranteed-visible CSS animations instead
  // of ever breaking or hiding content. Nothing here is required for the
  // site to work correctly.
  // ============================================================
  var REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var HAS_GSAP = !!(window.gsap && window.ScrollTrigger);
  if (HAS_GSAP){
    try { gsap.registerPlugin(ScrollTrigger); } catch(e){ HAS_GSAP = false; }
  }

  // ---- Cinematic scroll-triggered reveal (upgrades the always-on-load
  //      .pop-in cascade into a true scroll-in cascade, grouped by parent
  //      so sibling items — skill cards, timeline items, etc. — stagger
  //      together). Falls back to the plain .pop-in CSS animation whenever
  //      GSAP/ScrollTrigger aren't available. ----
  function initScrollReveal(){
    if (!HAS_GSAP || REDUCED_MOTION) return;
    try {
      var els = Array.prototype.slice.call(document.querySelectorAll('.pop-in:not(.work-card)'));
      if (!els.length) return;
      var groups = [];
      els.forEach(function(el){
        var parent = el.parentElement;
        var g = null;
        for (var i = 0; i < groups.length; i++){ if (groups[i].parent === parent){ g = groups[i]; break; } }
        if (!g){ g = { parent: parent, items: [] }; groups.push(g); }
        g.items.push(el);
      });
      groups.forEach(function(g){
        g.items.forEach(function(el){ el.classList.add('gsap-take-over'); });
        gsap.from(g.items, {
          opacity: 0, y: 26, duration: 0.75, ease: 'power2.out',
          stagger: g.items.length > 1 ? 0.08 : 0,
          scrollTrigger: { trigger: g.parent, start: 'top 88%', toggleActions: 'play none none none' }
        });
      });
    } catch(e){
      // If anything above goes wrong partway through, never leave content stuck
      // invisible — drop back to the safe, always-visible state immediately.
      document.querySelectorAll('.gsap-take-over').forEach(function(el){ el.classList.remove('gsap-take-over'); });
    }
  }

  // ---- Count-up animation for the Achievements numbers ----
  function initCountUp(){
    if (REDUCED_MOTION) return;
    var els = document.querySelectorAll('#achievementsGrid .stat strong');
    if (!els.length) return;
    els.forEach(function(el){
      var raw = el.textContent || '';
      var match = raw.match(/[\d.]+/);
      if (!match) return;
      var target = parseFloat(match[0]);
      if (isNaN(target)) return;
      var prefix = raw.slice(0, match.index);
      var suffix = raw.slice(match.index + match[0].length);
      var isInt = match[0].indexOf('.') === -1;
      var animated = false;
      function animate(){
        if (animated) return;
        animated = true;
        var start = null, DURATION = 1200;
        function step(ts){
          if (!start) start = ts;
          var progress = Math.min((ts - start) / DURATION, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          var current = target * eased;
          el.textContent = prefix + (isInt ? Math.round(current) : current.toFixed(1)) + suffix;
          if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }
      if ('IntersectionObserver' in window){
        var io = new IntersectionObserver(function(entries){
          entries.forEach(function(entry){ if (entry.isIntersecting){ animate(); io.disconnect(); } });
        }, { threshold: 0.4 });
        io.observe(el);
      } else {
        animate();
      }
    });
  }

  // ---- Magnetic hover on primary buttons/links (mouse-driven nudge) ----
  function initMagnetic(){
    if (REDUCED_MOTION) return;
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
    var targets = document.querySelectorAll('.primary, .secondary, .contact-form-link, #cfSubmit');
    targets.forEach(function(el){
      if (el._magneticWired) return;
      el._magneticWired = true;
      var xTo, yTo;
      if (HAS_GSAP){
        xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
        yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });
      }
      el.addEventListener('mousemove', function(e){
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) * 0.35;
        var dy = (e.clientY - r.top - r.height / 2) * 0.35;
        if (HAS_GSAP){ xTo(dx); yTo(dy); }
        else { el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; }
      });
      el.addEventListener('mouseleave', function(){
        if (HAS_GSAP){ xTo(0); yTo(0); }
        else { el.style.transform = ''; }
      });
    });
  }

  // ---- Subtle scroll parallax on the hero and about photos ----
  function initParallax(){
    if (!HAS_GSAP || REDUCED_MOTION) return;
    try {
      var heroImg = document.getElementById('heroPhoto');
      if (heroImg){
        gsap.fromTo(heroImg, { y: -18 }, {
          y: 18, ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 }
        });
      }
      var aboutBox = document.querySelector('.about-photo');
      var aboutImg = aboutBox && aboutBox.querySelector('img');
      if (aboutBox && aboutImg){
        var buffer = Math.max(0, aboutImg.getBoundingClientRect().height - aboutBox.getBoundingClientRect().height - 8);
        if (buffer > 4){
          gsap.fromTo(aboutImg, { y: 0 }, {
            y: -buffer, ease: 'none',
            scrollTrigger: { trigger: aboutBox, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
          });
        }
      }
    } catch(e){}
  }

  initMagnetic();

  // ============================================================
  // Social link helpers — real brand icons (Font Awesome, loaded in index.html)
  // ============================================================
  var ICON_CLASS = {
    whatsapp: 'fa-brands fa-whatsapp', facebook: 'fa-brands fa-facebook-f', instagram: 'fa-brands fa-instagram',
    linkedin: 'fa-brands fa-linkedin-in', telegram: 'fa-brands fa-telegram', email: 'fa-solid fa-envelope',
    behance: 'fa-brands fa-behance', website: 'fa-solid fa-globe'
  };
  function iconClassFor(social){ return ICON_CLASS[social.type] || 'fa-solid fa-link'; }
  function hrefFor(social){
    if (social.type === 'whatsapp') return 'https://wa.me/' + String(social.value || '').replace(/\D/g,'');
    if (social.type === 'email') return 'mailto:' + (social.value || '');
    return social.url || '#';
  }

  // ---- Fetch data (cache-bust lightly so edits via admin show up soon) ----
  // A timestamp query string forces every page load to bypass GitHub Pages'
  // CDN cache for this file (not just the browser's own cache) — otherwise
  // content edits made in the admin panel can take a while to show up live.
  fetch('data.json?v=' + Date.now(), { cache: 'no-cache' })
    .then(function(r){ return r.json(); })
    .then(render)
    .catch(function(err){ console.error('Could not load data.json', err); });

  // Visitor counter doesn't depend on profile data — start it independently.
  initVisitorCounter();

  function esc(s){
    if(s == null) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function socialLink(s, className){
    var a = document.createElement('a');
    a.href = hrefFor(s);
    a.className = className || '';
    a.setAttribute('aria-label', s.label || s.type);
    a.title = s.label || s.type;
    var icon = document.createElement('i');
    icon.className = iconClassFor(s);
    a.appendChild(icon);
    if (s.type !== 'email' && s.type !== 'whatsapp') { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }

  function render(data){
    var p = data.profile || {};
    var socials = data.socials || [];

    document.title = (p.name || 'Portfolio') + ' — Portfolio';

    // Hero
    var fullName = p.name || p.shortName || '';
    var short = p.shortName || '';
    var nameHtml;
    if (short && fullName.indexOf(short) !== -1){
      var idx = fullName.lastIndexOf(short);
      nameHtml = esc(fullName.slice(0, idx)) + '<span>' + esc(short) + '</span>' + esc(fullName.slice(idx + short.length));
    } else {
      nameHtml = '<span>' + esc(short || fullName) + '</span>';
    }
    setHTML('heroFullName', nameHtml);
    initRoleTyping((p.roles && p.roles.length) ? p.roles : [p.title].filter(Boolean));
    setHTML('heroLocation', '● ' + esc(p.location || ''));
    setText('heroSummary', p.summary || '');
    setHref('heroHireLink', p.email ? ('mailto:' + p.email) : '#');

    var heroPhoto = document.getElementById('heroPhoto');
    if (heroPhoto && p.photo) heroPhoto.src = p.photo;
    var aboutPhoto = document.getElementById('aboutPhoto');
    if (aboutPhoto && (p.aboutPhoto || p.photo)) aboutPhoto.src = p.aboutPhoto || p.photo;

    // Hero + footer social rows
    var heroSocials = document.getElementById('heroSocials');
    if (heroSocials) socials.forEach(function(s){ heroSocials.appendChild(socialLink(s)); });
    var footerSocial = document.getElementById('footerSocial');
    if (footerSocial) socials.forEach(function(s){ footerSocial.appendChild(socialLink(s)); });

    if (p.cv) { setHref('navCvLink', p.cv); }
    else { var ncl = document.getElementById('navCvLink'); if (ncl) ncl.style.display = 'none'; }

    // About
    setText('aboutBio', p.aboutBio || p.summary || '');
    setText('aboutSignature', p.shortName || '');

    // Quick facts list (name/title/location/email/phone/languages)
    var quickFacts = document.getElementById('quickFacts');
    if (quickFacts){
      var facts = [
        ['Name', p.name],
        ['Title', p.title],
        ['Location', p.location],
        ['Email', p.email],
        ['Phone', (p.phones || []).join(' / ')],
        ['Languages', p.languages]
      ];
      facts.forEach(function(f){
        if (!f[1]) return;
        var li = document.createElement('li');
        li.innerHTML = '<b>' + esc(f[0]) + '</b><span>' + esc(f[1]) + '</span>';
        quickFacts.appendChild(li);
      });
    }

    // Personal strengths
    var strengthsList = document.getElementById('strengthsList');
    if (strengthsList){
      (data.strengths || []).forEach(function(s, i){
        var li = document.createElement('li');
        li.className = 'pop-in';
        li.style.animationDelay = (i * 0.07) + 's';
        li.textContent = s;
        strengthsList.appendChild(li);
      });
      var strengthsSection = document.getElementById('strengths');
      if (strengthsSection && !(data.strengths || []).length) strengthsSection.style.display = 'none';
    }

    // Achievements -> stat row under About
    var achieveGrid = document.getElementById('achievementsGrid');
    if (achieveGrid){
      achieveGrid.style.setProperty('--stat-cols', String(Math.max((data.achievements || []).length, 1)));
      (data.achievements || []).forEach(function(a, i){
        var tile = document.createElement('div');
        tile.className = 'stat pop-in';
        tile.style.animationDelay = (i * 0.08) + 's';
        tile.innerHTML = '<strong>' + esc(a.value) + '</strong><span>' + esc(a.label) + '</span>';
        achieveGrid.appendChild(tile);
      });
    }

    // Contact strip: quote + a few key contact items
    setHTML('contactQuote', '“' + esc(p.quote || '') + '”');
    var contactRow = document.getElementById('contactRow');
    if (contactRow){
      var waEntries = socials.filter(function(s){ return s.type === 'whatsapp'; });
      var emailEntry = socials.filter(function(s){ return s.type === 'email'; })[0];
      var items = [];
      waEntries.slice(0, 2).forEach(function(s){ items.push({ label: s.label || 'WhatsApp', value: s.value }); });
      if (emailEntry || p.email) items.push({ label: 'Email', value: (emailEntry && emailEntry.value) || p.email });
      items.slice(0, 3).forEach(function(it, i){
        var div = document.createElement('div');
        div.className = 'contact-item pop-in';
        div.style.animationDelay = (i * 0.08) + 's';
        div.innerHTML = '<b>' + esc(it.label) + '</b>' + esc(it.value || '');
        contactRow.appendChild(div);
      });
    }

    // Skills
    function skillAbbr(category){
      var words = (category || '').split(/[\s&/-]+/).filter(Boolean);
      if (!words.length) return '••';
      if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    var skillsGrid = document.getElementById('skillsGrid');
    (data.skills || []).forEach(function(group, i){
      var card = document.createElement('div');
      card.className = 'skill pop-in';
      card.style.animationDelay = (i * 0.08) + 's';
      var items = (group.items || []).map(function(item){ return '<li>' + esc(item) + '</li>'; }).join('');
      card.innerHTML = '<div class="skill-icon">' + esc(skillAbbr(group.category)) + '</div>' +
        '<h3>' + esc(group.category) + '</h3><ul>' + items + '</ul>';
      skillsGrid.appendChild(card);
    });

    // Experience timeline
    var timeline = document.getElementById('timeline');
    (data.experience || []).forEach(function(job, i){
      var item = document.createElement('div');
      item.className = 'job pop-in';
      item.style.animationDelay = (i * 0.08) + 's';
      var points = (job.points || []).map(function(pt){ return '<li>' + esc(pt) + '</li>'; }).join('');
      item.innerHTML =
        '<span class="date">' + esc(job.period) + '</span>' +
        '<h3>' + esc(job.role) + '</h3>' +
        '<div class="place">' + esc(job.company) + '</div>' +
        (points ? '<ul class="job-points">' + points + '</ul>' : '');
      timeline.appendChild(item);
    });

    // Education (its own highlighted column)
    var eduList = document.getElementById('eduList');
    (data.education || []).forEach(function(ed, i){
      var row = document.createElement('div');
      row.className = 'edu pop-in';
      row.style.animationDelay = (i * 0.08) + 's';
      row.innerHTML = '<div><h3>' + esc(ed.degree) + '</h3><p>' + esc(ed.institute) + '</p></div>' +
        '<span class="year">' + esc(ed.period) + '</span>';
      eduList.appendChild(row);
    });

    // Ventures
    var ventureGrid = document.getElementById('ventureGrid');
    (data.ventures || []).forEach(function(v, i){
      var logo = v.image ? '<img class="venture-logo" src="' + esc(v.image) + '" alt="' + esc(v.name) + '">' : '';
      var titleIcon = (!v.image && v.icon) ? esc(v.icon) + ' ' : '';
      var inner = '<div>' + logo + '<h3>' + titleIcon + esc(v.name) + '</h3><p>' + esc(v.description || '') + '</p></div>' +
        '<span class="arrow">↗</span>';
      var card;
      if (v.url){
        card = document.createElement('a');
        card.href = v.url; card.target = '_blank'; card.rel = 'noopener';
      } else {
        card = document.createElement('div');
      }
      card.className = 'venture pop-in';
      card.style.animationDelay = (i * 0.08) + 's';
      card.innerHTML = inner;
      ventureGrid.appendChild(card);
    });

    // Work / Projects gallery (folder cards + lightbox for real pieces)
    initWorkGallery(data.projects || []);

    setText('year', new Date().getFullYear());
    setText('footerName', p.name || '');
    setText('footerBrandTitle', p.title || '');
    if (p.interests) setText('footerAbout', p.interests);

    initContactForm(p.formspreeId);
    wireMailtoFallback();

    // Run after all of the above has been added to the DOM, so the
    // scroll-reveal/parallax/count-up enhancements see the real content.
    initScrollReveal();
    initCountUp();
    initParallax();
    initMagnetic();
  }

  // ---- Visitor counter (free visitorbadge.io badge image, no signup needed) ----
  function initVisitorCounter(){
    var pill = document.getElementById('visitorCounter');
    var img = document.getElementById('visitorBadgeImg');
    if (!pill || !img) return;
    var pageUrl = location.origin + location.pathname;
    img.onload = function(){ pill.style.display = ''; };
    img.onerror = function(){ pill.style.display = 'none'; };
    img.src = 'https://api.visitorbadge.io/api/combined?path=' + encodeURIComponent(pageUrl) +
      '&label=Visits&labelColor=%23273b2d&countColor=%23f2b90c&style=flat-square';
  }

  // ---- Contact form (Formspree) — stays hidden until a form ID is set in admin ----
  function initContactForm(formspreeId){
    var section = document.getElementById('contactForm');
    var link = document.getElementById('contactFormLink');
    if (!section) return;
    // Accept either a bare form ID ("maeyzrby") or the full URL a user might
    // paste instead ("https://formspree.io/f/maeyzrby") — extract just the ID.
    var raw = (formspreeId || '').trim();
    var idMatch = raw.match(/([a-zA-Z0-9]+)\/?$/);
    var id = idMatch ? idMatch[1] : '';
    if (!id){
      section.style.display = 'none';
      if (link) link.style.display = 'none';
      return;
    }
    section.style.display = '';
    if (link) link.style.display = '';
    var form = document.getElementById('cform');
    var status = document.getElementById('cfStatus');
    var submitBtn = document.getElementById('cfSubmit');
    if (!form || form.dataset.wired) return;
    form.dataset.wired = '1';
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if (status){ status.textContent = 'Sending…'; status.className = 'form-status'; }
      if (submitBtn) submitBtn.disabled = true;
      var data = new FormData(form);
      fetch('https://formspree.io/f/' + id, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      }).then(function(r){
        if (r.ok){
          if (status){ status.textContent = 'Thank you! Your message has been sent — I\'ll get back to you soon.'; status.className = 'form-status ok'; }
          form.reset();
        } else {
          return r.json().then(function(j){ throw new Error((j.errors && j.errors[0] && j.errors[0].message) || 'Something went wrong'); });
        }
      }).catch(function(){
        if (status){ status.textContent = 'Could not send your message right now — please email me directly instead.'; status.className = 'form-status err'; }
      }).finally(function(){
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  // ---- Rotating role/profession typing animation (hero title) ----
  var roleTypingTimer = null;
  function initRoleTyping(roles){
    var el = document.getElementById('heroTitle');
    if (!el || !roles || !roles.length) return;
    clearTimeout(roleTypingTimer);
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || roles.length === 1){ el.textContent = roles[0]; return; }
    var TYPE_SPEED = 55, DELETE_SPEED = 28, HOLD = 1500, GAP = 400;
    var ri = 0, ci = 0, deleting = false;
    function tick(){
      var word = roles[ri];
      if (!deleting){
        ci++;
        el.textContent = word.slice(0, ci);
        if (ci >= word.length){
          deleting = true;
          roleTypingTimer = setTimeout(tick, HOLD);
          return;
        }
        roleTypingTimer = setTimeout(tick, TYPE_SPEED);
      } else {
        ci--;
        el.textContent = word.slice(0, ci);
        if (ci <= 0){
          deleting = false;
          ri = (ri + 1) % roles.length;
          roleTypingTimer = setTimeout(tick, GAP);
          return;
        }
        roleTypingTimer = setTimeout(tick, DELETE_SPEED);
      }
    }
    tick();
  }

  // ---- Work / Projects gallery: dark folder cards + combined full-screen
  // filterable overlay (hash-routed "dedicated view" within the same page) ----
  function initWorkGallery(folders){
    var cardsWrap = document.getElementById('galleryCards');
    var grid = document.getElementById('workGrid');
    var overlay = document.getElementById('galleryOverlay');
    var tabsWrap = document.getElementById('galleryFilterTabs');
    var viewFullBtn = document.getElementById('viewFullGalleryBtn');
    var backBtn = document.getElementById('galleryBack');
    if (!cardsWrap || !grid) return;
    folders = folders.filter(function(f){ return f && f.folder; });
    if (!folders.length){ if (viewFullBtn) viewFullBtn.style.display = 'none'; return; }

    var MINI = { 'Graphic Design': 'PS · AI', 'Motion Video Editing': 'PR · AE', 'Visa Documentation Samples': 'DOCS' };
    var FOLDER_STYLE = {
      'Graphic Design': { icon: 'Ps', grad: 'linear-gradient(135deg,#2f6b45,#0d8f7f)' },
      'Motion Video Editing': { icon: 'Pr', grad: 'linear-gradient(135deg,#c15a2e,#b5721e)' },
      'Visa Documentation Samples': { icon: '📄', grad: 'linear-gradient(135deg,#3a3f2e,#5c5647)' }
    };
    var ALL = 'All';
    var currentFilter = ALL;

    // Only count/show pieces that actually have an image — an empty "+ Add
    // piece" row someone forgot to finish filling in (no image chosen yet)
    // would otherwise render as a broken picture in the gallery.
    function realItems(f){ return (f.items || []).filter(function(it){ return it && it.image; }); }

    function renderCards(){
      cardsWrap.innerHTML = '';
      folders.forEach(function(f){
        var count = realItems(f).length;
        var card = document.createElement('div');
        card.className = 'work pop-in';
        if (f.thumbnail){
          card.style.backgroundImage = 'linear-gradient(180deg, rgba(10,14,12,.08), rgba(10,14,12,.85)), url("' + esc(f.thumbnail) + '")';
        }
        card.innerHTML = '<span class="mini">' + esc(MINI[f.folder] || 'FOLDER') + '</span>' +
          '<h3>' + esc(f.folder) + '</h3>' +
          '<p>' + (count ? (count + ' piece' + (count > 1 ? 's' : '')) : 'View Gallery →') + '</p>';
        card.addEventListener('click', function(){ openGalleryView(f.folder); });
        cardsWrap.appendChild(card);
      });
    }

    function renderTabs(){
      if (!tabsWrap) return;
      tabsWrap.innerHTML = '';
      var names = [ALL].concat(folders.map(function(f){ return f.folder; }));
      names.forEach(function(name){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = name === ALL ? 'All' : name;
        if (name === currentFilter) btn.classList.add('active');
        btn.addEventListener('click', function(){ showOverlayForFilter(name, true); });
        tabsWrap.appendChild(btn);
      });
    }

    function renderOverlayGrid(){
      grid.innerHTML = '';
      var foldersToShow = currentFilter === ALL ? folders : folders.filter(function(f){ return f.folder === currentFilter; });
      var i = 0, anyItem = false;
      foldersToShow.forEach(function(f){
        var items = realItems(f);
        if (!items.length) return;
        anyItem = true;
        items.forEach(function(item){
          var card = document.createElement('div');
          card.className = 'work-card pop-in';
          card.style.animationDelay = (Math.min(i++, 12) * 0.05) + 's';
          card.innerHTML = '<img src="' + esc(item.image) + '" alt="' + esc(item.title || '') + '" loading="lazy">' +
            (item.title ? '<figcaption>' + esc(item.title) + '</figcaption>' : '');
          card.addEventListener('click', function(){ openLightbox(item.image, item.title || ''); });
          grid.appendChild(card);
        });
        // A per-folder "See More" tile after that folder's real pieces —
        // wherever it appears (a single filtered folder, or grouped within
        // "All"), pointing to whatever link the admin panel has set for it.
        if (f.seeMoreUrl){
          var more = document.createElement('a');
          more.className = 'work-card work-see-more pop-in';
          more.style.animationDelay = (Math.min(i++, 12) * 0.05) + 's';
          more.href = f.seeMoreUrl;
          more.target = '_blank';
          more.rel = 'noopener';
          more.innerHTML = '<span class="see-more-inner">See More<span class="see-more-arrow">↗</span></span>';
          grid.appendChild(more);
        }
      });
      if (!anyItem){
        var fname = currentFilter === ALL ? 'Portfolio' : currentFilter;
        var style = FOLDER_STYLE[currentFilter] || { icon: '🗂️', grad: 'var(--grad)' };
        var empty = document.createElement('div');
        empty.className = 'work-empty';
        empty.style.background = style.grad;
        empty.style.color = '#fff';
        empty.innerHTML = '<div style="font-weight:800;font-size:1.1rem;margin-bottom:6px;">' + style.icon + ' ' + esc(fname) + '</div>' +
          '<div style="opacity:.85;">Real pieces coming soon — added via the admin panel.</div>';
        grid.appendChild(empty);
      }
    }

    function showOverlayForFilter(filterName, updateHash){
      currentFilter = folders.some(function(f){ return f.folder === filterName; }) ? filterName : ALL;
      renderTabs();
      renderOverlayGrid();
      if (updateHash){
        var hash = currentFilter === ALL ? '#gallery-view' : ('#gallery-view:' + encodeURIComponent(currentFilter));
        if (location.hash !== hash) history.pushState(null, '', hash);
      }
    }

    function openGalleryView(filterName){
      showOverlayForFilter(filterName || ALL, true);
      if (overlay) overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      overlay && overlay.scrollTo(0, 0);
    }

    function closeGalleryView(updateHash){
      if (overlay) overlay.classList.remove('open');
      document.body.style.overflow = '';
      if (updateHash && /^#gallery-view/.test(location.hash)){
        history.pushState(null, '', location.pathname + location.search + '#gallery');
      }
    }

    function hashToFilter(hash){
      var m = /^#gallery-view(?::(.*))?$/.exec(hash || '');
      if (!m) return null;
      return m[1] ? decodeURIComponent(m[1]) : ALL;
    }

    if (viewFullBtn) viewFullBtn.addEventListener('click', function(){ openGalleryView(ALL); });
    if (backBtn) backBtn.addEventListener('click', function(){ closeGalleryView(true); });
    if (overlay) overlay.addEventListener('click', function(e){ if (e.target === overlay) closeGalleryView(true); });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) closeGalleryView(true);
    });
    window.addEventListener('hashchange', function(){
      var f = hashToFilter(location.hash);
      if (f !== null){ openGalleryView(f); }
      else if (overlay && overlay.classList.contains('open')){ closeGalleryView(false); }
    });

    renderCards();

    // Deep-link support: if the page was opened directly with a gallery-view
    // hash (e.g. shared/bookmarked link), open straight into that view.
    var initialFilter = hashToFilter(location.hash);
    if (initialFilter !== null) openGalleryView(initialFilter);
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

  function setText(id, val){ var el = document.getElementById(id); if (el) el.textContent = val; }
  function setHTML(id, val){ var el = document.getElementById(id); if (el) el.innerHTML = val; }
  function setHref(id, val){ var el = document.getElementById(id); if (el && val) el.href = val; }

  // ---- Mobile nav toggle ----
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks){
    navToggle.addEventListener('click', function(){ navLinks.classList.toggle('open'); });
    navLinks.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ navLinks.classList.remove('open'); });
    });
  }

})();
