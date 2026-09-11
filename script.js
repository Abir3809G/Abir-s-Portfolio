(function(){
  "use strict";

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

    // Rotating title (typewriter-ish)
    var roles = [p.title, 'Motion Video Editor', 'Social Media Marketer', 'Business Owner'].filter(Boolean);
    typeRotate(document.getElementById('heroTitle'), roles);

    // Links
    setHref('behanceLink', p.behance);
    setHref('behanceLink2', p.behance);
    setHref('waLink', p.whatsapp);
    if (p.email) setHref('emailLink', 'mailto:' + p.email);

    // Stats
    setText('statExp', computeYears(data.experience) + '+');
    setText('statVentures', String((data.ventures || []).length));
    setText('statSkills', String((data.skills || []).length));

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
    });

    document.getElementById('year').textContent = new Date().getFullYear();

    // (Re)initialize scroll-reveal + nav for newly injected nodes
    initReveal();
  }

  function computeYears(experience){
    if (!experience || !experience.length) return 1;
    // crude estimate from earliest period text containing a 4-digit year
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

  // ---- Nav scroll state + mobile toggle ----
  var nav = document.getElementById('nav');
  window.addEventListener('scroll', function(){
    if (window.scrollY > 20) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
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
})();
