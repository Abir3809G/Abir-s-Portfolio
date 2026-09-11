(function(){
  "use strict";

  var LS_KEY = 'portfolio_admin_cfg_v1';
  var state = { cfg: null, data: null, sha: null };

  var el = {
    setupPanel: document.getElementById('setupPanel'),
    editor: document.getElementById('editor'),
    connState: document.getElementById('connState'),
    cfgOwner: document.getElementById('cfgOwner'),
    cfgRepo: document.getElementById('cfgRepo'),
    cfgBranch: document.getElementById('cfgBranch'),
    cfgToken: document.getElementById('cfgToken'),
    btnConnect: document.getElementById('btnConnect'),
    btnForget: document.getElementById('btnForget'),
    setupStatus: document.getElementById('setupStatus'),
    btnSave: document.getElementById('btnSave'),
    saveStatus: document.getElementById('saveStatus')
  };

  // ---------- utils ----------
  function showStatus(node, msg, ok){
    node.textContent = msg;
    node.className = 'status-msg show ' + (ok ? 'ok' : 'err');
  }
  function b64EncodeUnicode(str){
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64DecodeUnicode(str){
    return decodeURIComponent(escape(atob(str)));
  }
  function apiBase(){
    return 'https://api.github.com/repos/' + state.cfg.owner + '/' + state.cfg.repo + '/contents/data.json';
  }
  function ghHeaders(){
    return {
      'Authorization': 'Bearer ' + state.cfg.token,
      'Accept': 'application/vnd.github+json'
    };
  }

  // ---------- config persistence ----------
  function loadCfg(){
    try {
      var raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e){ return null; }
  }
  function saveCfg(cfg){
    try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch(e){}
  }
  function forgetCfg(){
    try { localStorage.removeItem(LS_KEY); } catch(e){}
    location.reload();
  }

  // ---------- GitHub I/O ----------
  function fetchData(){
    showStatus(el.setupStatus, 'Loading data.json from GitHub…', true);
    return fetch(apiBase() + '?ref=' + encodeURIComponent(state.cfg.branch), { headers: ghHeaders() })
      .then(function(r){
        if (!r.ok) throw new Error('GitHub responded ' + r.status + ' — check owner/repo/branch/token.');
        return r.json();
      })
      .then(function(json){
        state.sha = json.sha;
        state.data = JSON.parse(b64DecodeUnicode(json.content.replace(/\n/g,'')));
        return state.data;
      });
  }

  function saveData(){
    el.btnSave.disabled = true;
    el.btnSave.innerHTML = '<span class="spinner"></span>Saving…';
    var body = {
      message: 'Update portfolio content via admin panel',
      content: b64EncodeUnicode(JSON.stringify(state.data, null, 2)),
      sha: state.sha,
      branch: state.cfg.branch
    };
    fetch(apiBase(), { method: 'PUT', headers: Object.assign({'Content-Type':'application/json'}, ghHeaders()), body: JSON.stringify(body) })
      .then(function(r){
        if (!r.ok) return r.json().then(function(j){ throw new Error(j.message || ('GitHub responded ' + r.status)); });
        return r.json();
      })
      .then(function(json){
        state.sha = json.content.sha;
        showStatus(el.saveStatus, 'Saved! Your live site will update in about a minute.', true);
      })
      .catch(function(err){
        showStatus(el.saveStatus, 'Save failed: ' + err.message, false);
      })
      .finally(function(){
        el.btnSave.disabled = false;
        el.btnSave.textContent = 'Save to GitHub';
      });
  }

  // ---------- connect flow ----------
  el.btnConnect.addEventListener('click', function(){
    var cfg = {
      owner: el.cfgOwner.value.trim(),
      repo: el.cfgRepo.value.trim(),
      branch: (el.cfgBranch.value.trim() || 'main'),
      token: el.cfgToken.value.trim()
    };
    if (!cfg.owner || !cfg.repo || !cfg.token){
      showStatus(el.setupStatus, 'Please fill in username, repo name and token.', false);
      return;
    }
    state.cfg = cfg;
    fetchData().then(function(){
      saveCfg(cfg);
      el.setupStatus.className = 'status-msg';
      el.editor.style.display = 'block';
      el.btnForget.style.display = 'inline-flex';
      el.connState.textContent = 'Connected: ' + cfg.owner + '/' + cfg.repo + ' (' + cfg.branch + ')';
      populateForm();
    }).catch(function(err){
      showStatus(el.setupStatus, err.message, false);
    });
  });
  el.btnForget.addEventListener('click', forgetCfg);

  // Auto-connect if a config is already saved
  var saved = loadCfg();
  if (saved){
    el.cfgOwner.value = saved.owner || '';
    el.cfgRepo.value = saved.repo || '';
    el.cfgBranch.value = saved.branch || 'main';
    el.cfgToken.value = saved.token || '';
    el.btnForget.style.display = 'inline-flex';
    state.cfg = saved;
    fetchData().then(function(){
      el.setupStatus.className = 'status-msg';
      el.editor.style.display = 'block';
      el.connState.textContent = 'Connected: ' + saved.owner + '/' + saved.repo + ' (' + saved.branch + ')';
      populateForm();
    }).catch(function(err){
      showStatus(el.setupStatus, err.message, false);
    });
  }

  // ---------- form population ----------
  function bindText(id, getVal, setVal){
    var node = document.getElementById(id);
    node.value = getVal() || '';
    node.addEventListener('input', function(){ setVal(node.value); });
  }

  function populateForm(){
    var d = state.data;
    d.profile = d.profile || {};
    d.ventures = d.ventures || [];
    d.links = d.links || [];
    d.skills = d.skills || [];
    d.experience = d.experience || [];
    d.education = d.education || [];

    bindText('pName', function(){ return d.profile.name; }, function(v){ d.profile.name = v; });
    bindText('pShortName', function(){ return d.profile.shortName; }, function(v){ d.profile.shortName = v; });
    bindText('pTitle', function(){ return d.profile.title; }, function(v){ d.profile.title = v; });
    bindText('pLocation', function(){ return d.profile.location; }, function(v){ d.profile.location = v; });
    bindText('pEmail', function(){ return d.profile.email; }, function(v){ d.profile.email = v; });
    bindText('pPhones', function(){ return (d.profile.phones||[]).join(', '); }, function(v){ d.profile.phones = v.split(',').map(function(s){return s.trim();}).filter(Boolean); });
    bindText('pWhatsapp', function(){ return d.profile.whatsapp; }, function(v){ d.profile.whatsapp = v; });
    bindText('pBehance', function(){ return d.profile.behance; }, function(v){ d.profile.behance = v; });
    bindText('pPhoto', function(){ return d.profile.photo; }, function(v){ d.profile.photo = v; });
    bindText('pSummary', function(){ return d.profile.summary; }, function(v){ d.profile.summary = v; });

    renderVentures();
    renderLinks();
    renderSkills();
    renderExperience();
    renderEducation();
  }

  // ---------- generic row-list helper ----------
  function rowCard(innerHTML, onRemove){
    var card = document.createElement('div');
    card.className = 'row-card';
    card.innerHTML = innerHTML;
    var rm = card.querySelector('.js-remove');
    if (rm) rm.addEventListener('click', onRemove);
    return card;
  }

  // ---------- ventures ----------
  function renderVentures(){
    var wrap = document.getElementById('venturesList');
    wrap.innerHTML = '';
    state.data.ventures.forEach(function(v, i){
      var card = rowCard(
        '<div class="row-card-head"><b>Venture ' + (i+1) + '</b><button class="btn btn-sm btn-danger js-remove">Remove</button></div>' +
        '<div class="grid-2">' +
          '<div class="field"><label>Name</label><input class="js-name" value="' + attr(v.name) + '"></div>' +
          '<div class="field"><label>Icon (emoji)</label><input class="js-icon" value="' + attr(v.icon) + '"></div>' +
          '<div class="field" style="grid-column:1/-1"><label>Description</label><input class="js-desc" value="' + attr(v.description) + '"></div>' +
          '<div class="field" style="grid-column:1/-1"><label>URL (Facebook / Instagram link)</label><input class="js-url" value="' + attr(v.url) + '" placeholder="https://facebook.com/..."></div>' +
        '</div>',
        function(){ state.data.ventures.splice(i,1); renderVentures(); }
      );
      card.querySelector('.js-name').addEventListener('input', function(e){ v.name = e.target.value; });
      card.querySelector('.js-icon').addEventListener('input', function(e){ v.icon = e.target.value; });
      card.querySelector('.js-desc').addEventListener('input', function(e){ v.description = e.target.value; });
      card.querySelector('.js-url').addEventListener('input', function(e){ v.url = e.target.value; });
      wrap.appendChild(card);
    });
  }
  document.getElementById('btnAddVenture').addEventListener('click', function(){
    state.data.ventures.push({ name: 'New venture', description: '', url: '', icon: '✦' });
    renderVentures();
  });

  // ---------- generic links ----------
  function renderLinks(){
    var wrap = document.getElementById('linksList');
    wrap.innerHTML = '';
    state.data.links.forEach(function(l, i){
      var card = rowCard(
        '<div class="row-card-head"><b>Link ' + (i+1) + '</b><button class="btn btn-sm btn-danger js-remove">Remove</button></div>' +
        '<div class="grid-2">' +
          '<div class="field"><label>Label</label><input class="js-label" value="' + attr(l.label) + '"></div>' +
          '<div class="field"><label>URL</label><input class="js-url" value="' + attr(l.url) + '"></div>' +
        '</div>',
        function(){ state.data.links.splice(i,1); renderLinks(); }
      );
      card.querySelector('.js-label').addEventListener('input', function(e){ l.label = e.target.value; });
      card.querySelector('.js-url').addEventListener('input', function(e){ l.url = e.target.value; });
      wrap.appendChild(card);
    });
  }
  document.getElementById('btnAddLink').addEventListener('click', function(){
    state.data.links.push({ label: 'New link', url: '' });
    renderLinks();
  });

  // ---------- skills ----------
  function renderSkills(){
    var wrap = document.getElementById('skillsList');
    wrap.innerHTML = '';
    state.data.skills.forEach(function(group, gi){
      group.items = group.items || [];
      var card = rowCard(
        '<div class="row-card-head"><b>Group ' + (gi+1) + '</b><button class="btn btn-sm btn-danger js-remove">Remove group</button></div>' +
        '<div class="field"><label>Category name</label><input class="js-cat" value="' + attr(group.category) + '"></div>' +
        '<div class="list-tags-edit js-tags"></div>' +
        '<div class="add-inline"><input class="js-newtag" placeholder="Add a skill and press Enter"></div>',
        function(){ state.data.skills.splice(gi,1); renderSkills(); }
      );
      card.querySelector('.js-cat').addEventListener('input', function(e){ group.category = e.target.value; });
      var tagsWrap = card.querySelector('.js-tags');
      function renderTags(){
        tagsWrap.innerHTML = '';
        group.items.forEach(function(item, ii){
          var t = document.createElement('span');
          t.className = 'tag';
          t.innerHTML = esc(item) + ' <button type="button">&times;</button>';
          t.querySelector('button').addEventListener('click', function(){ group.items.splice(ii,1); renderTags(); });
          tagsWrap.appendChild(t);
        });
      }
      renderTags();
      var newTagInput = card.querySelector('.js-newtag');
      newTagInput.addEventListener('keydown', function(e){
        if (e.key === 'Enter' && newTagInput.value.trim()){
          e.preventDefault();
          group.items.push(newTagInput.value.trim());
          newTagInput.value = '';
          renderTags();
        }
      });
      wrap.appendChild(card);
    });
  }
  document.getElementById('btnAddSkillGroup').addEventListener('click', function(){
    state.data.skills.push({ category: 'New group', items: [] });
    renderSkills();
  });

  // ---------- experience ----------
  function renderExperience(){
    var wrap = document.getElementById('expList');
    wrap.innerHTML = '';
    state.data.experience.forEach(function(job, i){
      job.points = job.points || [];
      var card = rowCard(
        '<div class="row-card-head"><b>Job ' + (i+1) + '</b><button class="btn btn-sm btn-danger js-remove">Remove</button></div>' +
        '<div class="grid-2">' +
          '<div class="field"><label>Role</label><input class="js-role" value="' + attr(job.role) + '"></div>' +
          '<div class="field"><label>Company</label><input class="js-company" value="' + attr(job.company) + '"></div>' +
          '<div class="field" style="grid-column:1/-1"><label>Period</label><input class="js-period" value="' + attr(job.period) + '"></div>' +
        '</div>' +
        '<div class="field"><label>Highlights (one per line)</label><textarea class="js-points" rows="4">' + esc(job.points.join('\n')) + '</textarea></div>',
        function(){ state.data.experience.splice(i,1); renderExperience(); }
      );
      card.querySelector('.js-role').addEventListener('input', function(e){ job.role = e.target.value; });
      card.querySelector('.js-company').addEventListener('input', function(e){ job.company = e.target.value; });
      card.querySelector('.js-period').addEventListener('input', function(e){ job.period = e.target.value; });
      card.querySelector('.js-points').addEventListener('input', function(e){ job.points = e.target.value.split('\n').map(function(s){return s.trim();}).filter(Boolean); });
      wrap.appendChild(card);
    });
  }
  document.getElementById('btnAddExp').addEventListener('click', function(){
    state.data.experience.unshift({ role: 'New role', company: '', period: '', points: [] });
    renderExperience();
  });

  // ---------- education ----------
  function renderEducation(){
    var wrap = document.getElementById('eduList');
    wrap.innerHTML = '';
    state.data.education.forEach(function(ed, i){
      var card = rowCard(
        '<div class="row-card-head"><b>Education ' + (i+1) + '</b><button class="btn btn-sm btn-danger js-remove">Remove</button></div>' +
        '<div class="grid-2">' +
          '<div class="field" style="grid-column:1/-1"><label>Degree</label><input class="js-degree" value="' + attr(ed.degree) + '"></div>' +
          '<div class="field"><label>Institute</label><input class="js-institute" value="' + attr(ed.institute) + '"></div>' +
          '<div class="field"><label>Period</label><input class="js-period" value="' + attr(ed.period) + '"></div>' +
        '</div>',
        function(){ state.data.education.splice(i,1); renderEducation(); }
      );
      card.querySelector('.js-degree').addEventListener('input', function(e){ ed.degree = e.target.value; });
      card.querySelector('.js-institute').addEventListener('input', function(e){ ed.institute = e.target.value; });
      card.querySelector('.js-period').addEventListener('input', function(e){ ed.period = e.target.value; });
      wrap.appendChild(card);
    });
  }
  document.getElementById('btnAddEdu').addEventListener('click', function(){
    state.data.education.push({ degree: 'New degree', institute: '', period: '' });
    renderEducation();
  });

  // ---------- save ----------
  el.btnSave.addEventListener('click', saveData);

  function esc(s){
    var d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML;
  }
  function attr(s){
    return esc(s).replace(/"/g, '&quot;');
  }
})();
