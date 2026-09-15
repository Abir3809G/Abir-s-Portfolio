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
    saveStatus: document.getElementById('saveStatus'),
    saveHint: document.getElementById('saveHint')
  };

  // Uploading a file only pushes the file itself to GitHub — the change
  // doesn't take effect on the site until "Save to GitHub" is pressed too.
  // Make that impossible to miss: after any upload, visibly highlight the
  // Save button until it's actually clicked.
  function flagUnsavedUpload(){
    if (el.btnSave) el.btnSave.classList.add('needs-save');
    if (el.saveHint) el.saveHint.textContent = 'You just uploaded a file — press "Save to GitHub" below now, or it won\'t appear on your site.';
  }
  function clearUnsavedFlag(){
    if (el.btnSave) el.btnSave.classList.remove('needs-save');
    if (el.saveHint) el.saveHint.textContent = 'Unsaved changes are kept only in this tab until you save.';
  }

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

  // ---------- direct image/file upload straight into the GitHub repo ----------
  // Reads the chosen file, base64-encodes it, and PUTs it to assets/... via the
  // same Contents API used for data.json — no need to go to GitHub yourself.
  function uploadFileToGitHub(file, destFolder){
    return new Promise(function(resolve, reject){
      if (!file){ reject(new Error('No file selected')); return; }
      if (file.size > 8 * 1024 * 1024){ reject(new Error('File too large (max ~8MB) — please compress it first.')); return; }
      var reader = new FileReader();
      reader.onerror = function(){ reject(new Error('Could not read the file')); };
      reader.onload = function(){
        var base64 = String(reader.result).split(',')[1] || '';
        var safeName = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9_.-]+/g, '-');
        var path = destFolder.replace(/\/+$/, '') + '/' + safeName;
        var apiUrl = 'https://api.github.com/repos/' + state.cfg.owner + '/' + state.cfg.repo + '/contents/' + path;
        fetch(apiUrl + '?ref=' + encodeURIComponent(state.cfg.branch), { headers: ghHeaders() })
          .then(function(r){ return r.ok ? r.json() : null; })
          .catch(function(){ return null; })
          .then(function(existing){
            var body = { message: 'Upload via admin panel: ' + safeName, content: base64, branch: state.cfg.branch };
            if (existing && existing.sha) body.sha = existing.sha;
            return fetch(apiUrl, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders()), body: JSON.stringify(body) });
          })
          .then(function(r){
            if (!r.ok) return r.json().then(function(j){ throw new Error(j.message || ('GitHub responded ' + r.status)); });
            return r.json();
          })
          .then(function(){ resolve(path); })
          .catch(reject);
      };
      reader.readAsDataURL(file);
    });
  }
  // Wires a <input type="file"> so picking a file uploads it immediately and
  // hands the resulting assets/ path to onDone (which fills the matching text
  // field / data value). The text field still needs "Save to GitHub" pressed
  // afterwards so data.json itself gets updated with the new path.
  function wireUpload(fileInputEl, destFolder, onDone, statusEl){
    if (!fileInputEl) return;
    fileInputEl.addEventListener('change', function(){
      var file = fileInputEl.files && fileInputEl.files[0];
      if (!file) return;
      if (statusEl){ statusEl.textContent = 'Uploading…'; statusEl.className = 'upload-status'; }
      uploadFileToGitHub(file, destFolder).then(function(path){
        onDone(path);
        if (statusEl){ statusEl.textContent = 'Uploaded ✓ — now press "Save to GitHub" below to use it.'; statusEl.className = 'upload-status ok'; }
        fileInputEl.value = '';
        flagUnsavedUpload();
      }).catch(function(err){
        if (statusEl){ statusEl.textContent = 'Upload failed: ' + err.message; statusEl.className = 'upload-status err'; }
      });
    });
  }

  // ---------- permanent delete from GitHub, with cross-reference safety ----------
  // Every image/file path currently referenced anywhere in the (in-memory,
  // not-yet-saved) data — so a file is never deleted from GitHub while it's
  // still being used somewhere else (e.g. the same photo reused as both a
  // folder thumbnail and a venture logo).
  function allReferencedPaths(){
    var paths = [];
    function add(p){ if (p) paths.push(p); }
    var d = state.data || {};
    if (d.profile){
      add(d.profile.photo); add(d.profile.aboutPhoto); add(d.profile.cv);
      (d.profile.cvs || []).forEach(function(c){ add(c.file); });
    }
    (d.projects || []).forEach(function(f){
      add(f.thumbnail);
      (f.items || []).forEach(function(it){ add(it.image); });
    });
    (d.ventures || []).forEach(function(v){ add(v.image); });
    return paths;
  }
  // Call this AFTER the in-memory reference to `path` has already been
  // cleared/removed. If nothing else still points to it, deletes the file
  // from GitHub for real. Best-effort: any failure here is silently ignored
  // rather than interrupting the admin UI — it never touches data.json itself.
  function maybeDeleteOrphanedFile(path){
    if (!path || !/^assets\//.test(path)) return;
    if (allReferencedPaths().indexOf(path) !== -1) return; // still used elsewhere — keep it
    var apiUrl = 'https://api.github.com/repos/' + state.cfg.owner + '/' + state.cfg.repo + '/contents/' + path;
    fetch(apiUrl + '?ref=' + encodeURIComponent(state.cfg.branch), { headers: ghHeaders() })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(existing){
        if (!existing || !existing.sha) return;
        return fetch(apiUrl, {
          method: 'DELETE',
          headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders()),
          body: JSON.stringify({ message: 'Remove unused file via admin panel', sha: existing.sha, branch: state.cfg.branch })
        });
      })
      .catch(function(){ /* cleanup is best-effort only */ });
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
    attemptSave(false);
  }

  function finishSaveUI(){
    el.btnSave.disabled = false;
    el.btnSave.textContent = 'Save to GitHub';
  }

  // Saves data.json. If the file changed on GitHub since this page loaded
  // (most commonly: files were also uploaded/replaced by hand on github.com
  // in the same session), GitHub rejects the save with a sha mismatch —
  // instead of just failing, fetch the current sha and retry automatically
  // once, so a stale admin tab doesn't need a manual reload to save again.
  function attemptSave(isRetry){
    var body = {
      message: 'Update portfolio content via admin panel',
      content: b64EncodeUnicode(JSON.stringify(state.data, null, 2)),
      sha: state.sha,
      branch: state.cfg.branch
    };
    fetch(apiBase(), { method: 'PUT', headers: Object.assign({'Content-Type':'application/json'}, ghHeaders()), body: JSON.stringify(body) })
      .then(function(r){
        if (!r.ok) return r.json().then(function(j){ var err = new Error(j.message || ('GitHub responded ' + r.status)); err.status = r.status; throw err; });
        return r.json();
      })
      .then(function(json){
        state.sha = json.content.sha;
        showStatus(el.saveStatus, 'Saved! Your live site will update in about a minute.', true);
        clearUnsavedFlag();
        finishSaveUI();
      })
      .catch(function(err){
        var looksLikeShaConflict = err.status === 409 || /sha/i.test(err.message || '');
        if (looksLikeShaConflict && !isRetry){
          showStatus(el.saveStatus, 'This file changed on GitHub since the page loaded — refreshing and retrying automatically…', true);
          fetch(apiBase() + '?ref=' + encodeURIComponent(state.cfg.branch), { headers: ghHeaders() })
            .then(function(r){ return r.ok ? r.json() : null; })
            .then(function(fresh){
              if (fresh && fresh.sha){
                state.sha = fresh.sha;
                attemptSave(true);
              } else {
                showStatus(el.saveStatus, 'Save failed: ' + err.message + ' — please reload the admin page and try again.', false);
                finishSaveUI();
              }
            })
            .catch(function(){
              showStatus(el.saveStatus, 'Save failed: ' + err.message + ' — please reload the admin page and try again.', false);
              finishSaveUI();
            });
        } else {
          showStatus(el.saveStatus, 'Save failed: ' + err.message + (looksLikeShaConflict ? ' — please reload the admin page and try again.' : ''), false);
          finishSaveUI();
        }
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
    if (!node) return; // a field that no longer exists in the HTML should never silently break the rest of the form
    node.value = getVal() || '';
    node.addEventListener('input', function(){ setVal(node.value); });
  }

  function populateForm(){
    var d = state.data;
    d.profile = d.profile || {};
    d.ventures = d.ventures || [];
    d.socials = d.socials || [];
    d.skills = d.skills || [];
    d.experience = d.experience || [];
    d.education = d.education || [];
    d.achievements = d.achievements || [];
    d.projects = d.projects || [];
    d.strengths = d.strengths || [];

    bindText('pName', function(){ return d.profile.name; }, function(v){ d.profile.name = v; });
    bindText('pShortName', function(){ return d.profile.shortName; }, function(v){ d.profile.shortName = v; });
    bindText('pTitle', function(){ return d.profile.title; }, function(v){ d.profile.title = v; });
    bindText('pRoles', function(){ return (d.profile.roles||[]).join(', '); }, function(v){ d.profile.roles = v.split(',').map(function(s){return s.trim();}).filter(Boolean); });
    bindText('pLocation', function(){ return d.profile.location; }, function(v){ d.profile.location = v; });
    bindText('pEmail', function(){ return d.profile.email; }, function(v){ d.profile.email = v; });
    bindText('pPhones', function(){ return (d.profile.phones||[]).join(', '); }, function(v){ d.profile.phones = v.split(',').map(function(s){return s.trim();}).filter(Boolean); });
    bindText('pPhoto', function(){ return d.profile.photo; }, function(v){ d.profile.photo = v; });
    bindText('pAboutPhoto', function(){ return d.profile.aboutPhoto; }, function(v){ d.profile.aboutPhoto = v; });
    bindText('pSummary', function(){ return d.profile.summary; }, function(v){ d.profile.summary = v; });
    bindText('pAboutBio', function(){ return d.profile.aboutBio; }, function(v){ d.profile.aboutBio = v; });
    bindText('pQuote', function(){ return d.profile.quote; }, function(v){ d.profile.quote = v; });
    bindText('pLanguages', function(){ return d.profile.languages; }, function(v){ d.profile.languages = v; });
    bindText('pInterests', function(){ return d.profile.interests; }, function(v){ d.profile.interests = v; });
    bindText('pFormspreeId', function(){ return d.profile.formspreeId; }, function(v){ d.profile.formspreeId = v.trim(); });
    bindText('pCvPassword', function(){ return d.profile.cvPassword; }, function(v){ d.profile.cvPassword = v; });

    wireUpload(document.getElementById('pPhotoFile'), 'assets/uploads', function(path){
      var old = d.profile.photo;
      d.profile.photo = path;
      document.getElementById('pPhoto').value = path;
      if (old && old !== path) maybeDeleteOrphanedFile(old);
    }, document.getElementById('pPhotoFileStatus'));
    wireUpload(document.getElementById('pAboutPhotoFile'), 'assets/uploads', function(path){
      var old = d.profile.aboutPhoto;
      d.profile.aboutPhoto = path;
      document.getElementById('pAboutPhoto').value = path;
      if (old && old !== path) maybeDeleteOrphanedFile(old);
    }, document.getElementById('pAboutPhotoFileStatus'));
    // Migrate the older single profile.cv field (if it still has a value and
    // no role-based CVs have been set up yet) into the new list, so his
    // already-uploaded CV isn't orphaned by this change.
    d.profile.cvs = d.profile.cvs || [];
    if (!d.profile.cvs.length && d.profile.cv){
      d.profile.cvs.push({ label: 'General', file: d.profile.cv });
      d.profile.cv = ''; // now tracked in cvs[] only, so it isn't double-counted as "still in use" if removed
    }

    renderVentures();
    renderSocials();
    renderSkills();
    renderExperience();
    renderEducation();
    renderAchievements();
    renderFolders();
    renderStrengths();
    renderCvs();
  }

  // ---------- CV downloads (role-based list) ----------
  function renderCvs(){
    var wrap = document.getElementById('cvList');
    wrap.innerHTML = '';
    state.data.profile.cvs.forEach(function(c, i){
      var card = rowCard(
        '<div class="row-card-head"><b>CV ' + (i+1) + '</b><button class="btn btn-sm btn-danger js-remove">Remove</button></div>' +
        '<div class="field"><label>Role / label (shown in the dropdown)</label><input class="js-label" value="' + attr(c.label) + '" placeholder="e.g. Web Developer"></div>' +
        '<div class="field" style="grid-column:1/-1"><label>CV file (PDF)</label>' +
          '<input class="js-file" value="' + attr(c.file) + '" placeholder="assets/CV-Web-Developer.pdf">' +
          '<input type="file" accept="application/pdf" class="upload-input js-file-file"><span class="upload-status js-file-status"></span>' +
          '<button type="button" class="btn btn-sm btn-danger js-file-clear" style="margin-top:6px;">🗑 Remove file</button></div>',
        function(){
          var removed = c.file;
          state.data.profile.cvs.splice(i,1); renderCvs();
          maybeDeleteOrphanedFile(removed);
          flagUnsavedUpload();
        }
      );
      card.querySelector('.js-label').addEventListener('input', function(e){ c.label = e.target.value; });
      var fileInput = card.querySelector('.js-file');
      fileInput.addEventListener('input', function(e){ c.file = e.target.value; });
      wireUpload(card.querySelector('.js-file-file'), 'assets', function(path){
        var old = c.file;
        c.file = path; fileInput.value = path;
        if (old && old !== path) maybeDeleteOrphanedFile(old);
      }, card.querySelector('.js-file-status'));
      card.querySelector('.js-file-clear').addEventListener('click', function(){
        var old = c.file;
        c.file = ''; fileInput.value = '';
        maybeDeleteOrphanedFile(old);
        flagUnsavedUpload();
      });
      wrap.appendChild(card);
    });
  }
  document.getElementById('btnAddCv').addEventListener('click', function(){
    state.data.profile.cvs.push({ label: 'New role', file: '' });
    renderCvs();
  });

  // ---------- generic row-list helper ----------
  function rowCard(innerHTML, onRemove){
    var card = document.createElement('div');
    card.className = 'row-card';
    card.innerHTML = innerHTML;
    var rm = card.querySelector('.js-remove');
    if (rm) rm.addEventListener('click', onRemove);
    return card;
  }

  // ---------- achievements ----------
  function renderAchievements(){
    var wrap = document.getElementById('achievementsList');
    wrap.innerHTML = '';
    state.data.achievements.forEach(function(a, i){
      var card = rowCard(
        '<div class="row-card-head"><b>Achievement ' + (i+1) + '</b><button class="btn btn-sm btn-danger js-remove">Remove</button></div>' +
        '<div class="grid-2">' +
          '<div class="field"><label>Value (big number/text)</label><input class="js-value" value="' + attr(a.value) + '"></div>' +
          '<div class="field"><label>Label</label><input class="js-label" value="' + attr(a.label) + '"></div>' +
        '</div>',
        function(){ state.data.achievements.splice(i,1); renderAchievements(); }
      );
      card.querySelector('.js-value').addEventListener('input', function(e){ a.value = e.target.value; });
      card.querySelector('.js-label').addEventListener('input', function(e){ a.label = e.target.value; });
      wrap.appendChild(card);
    });
  }
  document.getElementById('btnAddAchievement').addEventListener('click', function(){
    state.data.achievements.push({ value: '0', label: 'New achievement' });
    renderAchievements();
  });

  // ---------- personal strengths (plain list of strings) ----------
  function renderStrengths(){
    var wrap = document.getElementById('strengthsListAdmin');
    wrap.innerHTML = '';
    state.data.strengths.forEach(function(s, i){
      var card = rowCard(
        '<div class="row-card-head"><b>Strength ' + (i+1) + '</b><button class="btn btn-sm btn-danger js-remove">Remove</button></div>' +
        '<div class="field"><input class="js-value" value="' + attr(s) + '"></div>',
        function(){ state.data.strengths.splice(i,1); renderStrengths(); }
      );
      card.querySelector('.js-value').addEventListener('input', function(e){ state.data.strengths[i] = e.target.value; });
      wrap.appendChild(card);
    });
  }
  document.getElementById('btnAddStrength').addEventListener('click', function(){
    state.data.strengths.push('New strength');
    renderStrengths();
  });

  // ---------- work / projects (folders of items) ----------
  function renderFolders(){
    var wrap = document.getElementById('foldersList');
    wrap.innerHTML = '';
    state.data.projects.forEach(function(folder, fi){
      folder.items = folder.items || [];
      folder.thumbnail = folder.thumbnail || '';
      folder.seeMoreUrl = folder.seeMoreUrl || '';
      var card = rowCard(
        '<div class="row-card-head"><b>Folder ' + (fi+1) + '</b><button class="btn btn-sm btn-danger js-remove-folder">Remove folder</button></div>' +
        '<div class="field"><label>Folder name</label><input class="js-folder-name" value="' + attr(folder.folder) + '"></div>' +
        '<div class="field"><label>Thumbnail image (shown as the cover photo on this folder\'s card)</label>' +
          '<input class="js-thumb" value="' + attr(folder.thumbnail) + '" placeholder="assets/work/graphic-design-cover.jpg">' +
          '<input type="file" accept="image/*" class="upload-input js-thumb-file"><span class="upload-status js-thumb-status"></span>' +
          '<button type="button" class="btn btn-sm btn-danger js-thumb-clear" style="margin-top:6px;">🗑 Remove image</button></div>' +
        '<div class="field"><label>"See More" link (optional — shown as a tile after this folder\'s pieces in the full gallery view)</label>' +
          '<input class="js-see-more" value="' + attr(folder.seeMoreUrl) + '" placeholder="https://behance.net/... or any link with more of this work"></div>' +
        '<div class="js-items"></div>' +
        '<button type="button" class="btn btn-sm js-add-item">+ Add piece to this folder</button>',
        function(){ state.data.projects.splice(fi,1); renderFolders(); }
      );
      card.querySelector('.js-remove-folder').addEventListener('click', function(){
        var removed = folder;
        state.data.projects.splice(fi,1); renderFolders();
        maybeDeleteOrphanedFile(removed.thumbnail);
        (removed.items || []).forEach(function(it){ maybeDeleteOrphanedFile(it.image); });
        flagUnsavedUpload();
      });
      card.querySelector('.js-folder-name').addEventListener('input', function(e){ folder.folder = e.target.value; });
      card.querySelector('.js-see-more').addEventListener('input', function(e){ folder.seeMoreUrl = e.target.value; });
      var thumbInput = card.querySelector('.js-thumb');
      thumbInput.addEventListener('input', function(e){ folder.thumbnail = e.target.value; });
      wireUpload(card.querySelector('.js-thumb-file'), 'assets/work', function(path){
        var old = folder.thumbnail;
        folder.thumbnail = path; thumbInput.value = path;
        if (old && old !== path) maybeDeleteOrphanedFile(old);
      }, card.querySelector('.js-thumb-status'));
      card.querySelector('.js-thumb-clear').addEventListener('click', function(){
        var old = folder.thumbnail;
        folder.thumbnail = ''; thumbInput.value = '';
        maybeDeleteOrphanedFile(old);
        flagUnsavedUpload();
      });

      var itemsWrap = card.querySelector('.js-items');
      function renderItems(){
        itemsWrap.innerHTML = '';
        folder.items.forEach(function(item, ii){
          var itemCard = document.createElement('div');
          itemCard.className = 'row-card';
          itemCard.style.background = 'var(--bg)';
          itemCard.innerHTML =
            '<div class="row-card-head"><b>Piece ' + (ii+1) + '</b><button class="btn btn-sm btn-danger js-remove-item">Remove</button></div>' +
            '<div class="grid-2">' +
              '<div class="field"><label>Title / caption</label><input class="js-title" value="' + attr(item.title) + '"></div>' +
              '<div class="field"><label>Link (optional)</label><input class="js-link" value="' + attr(item.link) + '"></div>' +
              '<div class="field" style="grid-column:1/-1"><label>Image</label>' +
                '<input class="js-image" value="' + attr(item.image) + '" placeholder="assets/work/example.jpg">' +
                '<input type="file" accept="image/*" class="upload-input js-image-file"><span class="upload-status js-image-status"></span>' +
                '<button type="button" class="btn btn-sm btn-danger js-image-clear" style="margin-top:6px;">🗑 Remove image</button></div>' +
            '</div>';
          itemCard.querySelector('.js-remove-item').addEventListener('click', function(){
            var removedImg = item.image;
            folder.items.splice(ii,1); renderItems(); renderTabCountHint();
            maybeDeleteOrphanedFile(removedImg);
            flagUnsavedUpload();
          });
          itemCard.querySelector('.js-title').addEventListener('input', function(e){ item.title = e.target.value; });
          itemCard.querySelector('.js-link').addEventListener('input', function(e){ item.link = e.target.value; });
          var itemImageInput = itemCard.querySelector('.js-image');
          itemImageInput.addEventListener('input', function(e){ item.image = e.target.value; });
          wireUpload(itemCard.querySelector('.js-image-file'), 'assets/work', function(path){
            var old = item.image;
            item.image = path; itemImageInput.value = path;
            if (old && old !== path) maybeDeleteOrphanedFile(old);
          }, itemCard.querySelector('.js-image-status'));
          itemCard.querySelector('.js-image-clear').addEventListener('click', function(){
            var old = item.image;
            item.image = ''; itemImageInput.value = '';
            maybeDeleteOrphanedFile(old);
            flagUnsavedUpload();
          });
          itemsWrap.appendChild(itemCard);
        });
      }
      function renderTabCountHint(){ /* no-op placeholder for future live counts */ }
      renderItems();
      card.querySelector('.js-add-item').addEventListener('click', function(){
        folder.items.push({ title: '', image: '', link: '' });
        renderItems();
      });
      wrap.appendChild(card);
    });
  }
  document.getElementById('btnAddFolder').addEventListener('click', function(){
    state.data.projects.push({ folder: 'New folder', items: [] });
    renderFolders();
  });

  // ---------- ventures ----------
  function renderVentures(){
    var wrap = document.getElementById('venturesList');
    wrap.innerHTML = '';
    state.data.ventures.forEach(function(v, i){
      v.image = v.image || '';
      var card = rowCard(
        '<div class="row-card-head"><b>Venture ' + (i+1) + '</b><button class="btn btn-sm btn-danger js-remove">Remove</button></div>' +
        '<div class="grid-2">' +
          '<div class="field"><label>Name</label><input class="js-name" value="' + attr(v.name) + '"></div>' +
          '<div class="field"><label>Icon (emoji — used only if no logo image is set below)</label><input class="js-icon" value="' + attr(v.icon) + '"></div>' +
          '<div class="field" style="grid-column:1/-1"><label>Description</label><input class="js-desc" value="' + attr(v.description) + '"></div>' +
          '<div class="field" style="grid-column:1/-1"><label>URL (Facebook / Instagram link)</label><input class="js-url" value="' + attr(v.url) + '" placeholder="https://facebook.com/..."></div>' +
          '<div class="field" style="grid-column:1/-1"><label>Logo / image (optional — replaces the emoji icon above)</label>' +
            '<input class="js-image" value="' + attr(v.image) + '" placeholder="assets/uploads/khalifa-logo.png">' +
            '<input type="file" accept="image/*" class="upload-input js-image-file"><span class="upload-status js-image-status"></span>' +
            '<button type="button" class="btn btn-sm btn-danger js-image-clear" style="margin-top:6px;">🗑 Remove image</button></div>' +
        '</div>',
        function(){
          var removedImg = v.image;
          state.data.ventures.splice(i,1); renderVentures();
          maybeDeleteOrphanedFile(removedImg);
          flagUnsavedUpload();
        }
      );
      card.querySelector('.js-name').addEventListener('input', function(e){ v.name = e.target.value; });
      card.querySelector('.js-icon').addEventListener('input', function(e){ v.icon = e.target.value; });
      card.querySelector('.js-desc').addEventListener('input', function(e){ v.description = e.target.value; });
      card.querySelector('.js-url').addEventListener('input', function(e){ v.url = e.target.value; });
      var imageInput = card.querySelector('.js-image');
      imageInput.addEventListener('input', function(e){ v.image = e.target.value; });
      wireUpload(card.querySelector('.js-image-file'), 'assets/uploads', function(path){
        var old = v.image;
        v.image = path; imageInput.value = path;
        if (old && old !== path) maybeDeleteOrphanedFile(old);
      }, card.querySelector('.js-image-status'));
      card.querySelector('.js-image-clear').addEventListener('click', function(){
        var old = v.image;
        v.image = ''; imageInput.value = '';
        maybeDeleteOrphanedFile(old);
        flagUnsavedUpload();
      });
      wrap.appendChild(card);
    });
  }
  document.getElementById('btnAddVenture').addEventListener('click', function(){
    state.data.ventures.push({ name: 'New venture', description: '', url: '', icon: '✦', image: '' });
    renderVentures();
  });

  // ---------- socials (connect links) ----------
  var SOCIAL_TYPES = [
    ['whatsapp', 'WhatsApp'],
    ['facebook', 'Facebook'],
    ['instagram', 'Instagram'],
    ['linkedin', 'LinkedIn'],
    ['telegram', 'Telegram'],
    ['email', 'Email'],
    ['behance', 'Behance'],
    ['website', 'Website / other']
  ];
  function socialTypeOptions(selected){
    return SOCIAL_TYPES.map(function(t){
      return '<option value="' + t[0] + '"' + (t[0] === selected ? ' selected' : '') + '>' + t[1] + '</option>';
    }).join('');
  }
  function renderSocials(){
    var wrap = document.getElementById('socialsList');
    wrap.innerHTML = '';
    state.data.socials.forEach(function(s, i){
      var isValueType = (s.type === 'whatsapp' || s.type === 'email');
      var valueLabel = s.type === 'whatsapp' ? 'Phone number (with country code, no + or spaces, e.g. 8801XXXXXXXXX)' : 'Email address';
      var card = rowCard(
        '<div class="row-card-head"><b>Social ' + (i+1) + '</b><button class="btn btn-sm btn-danger js-remove">Remove</button></div>' +
        '<div class="grid-2">' +
          '<div class="field"><label>Type</label><select class="js-type">' + socialTypeOptions(s.type) + '</select></div>' +
          '<div class="field"><label>Label (shown under the icon)</label><input class="js-label" value="' + attr(s.label) + '"></div>' +
          '<div class="field js-value-field" style="grid-column:1/-1"><label class="js-value-label">' + valueLabel + '</label>' +
            '<input class="js-value" value="' + attr(isValueType ? s.value : s.url) + '"></div>' +
        '</div>',
        function(){ state.data.socials.splice(i,1); renderSocials(); }
      );
      card.querySelector('.js-label').addEventListener('input', function(e){ s.label = e.target.value; });
      var typeSelect = card.querySelector('.js-type');
      var valueInput = card.querySelector('.js-value');
      var valueLabelEl = card.querySelector('.js-value-label');
      function syncValueLabel(){
        var t = typeSelect.value;
        valueLabelEl.textContent = t === 'whatsapp'
          ? 'Phone number (with country code, no + or spaces, e.g. 8801XXXXXXXXX)'
          : t === 'email' ? 'Email address' : 'Profile / page URL';
      }
      typeSelect.addEventListener('change', function(){
        s.type = typeSelect.value;
        syncValueLabel();
      });
      valueInput.addEventListener('input', function(e){
        if (s.type === 'whatsapp' || s.type === 'email') s.value = e.target.value;
        else s.url = e.target.value;
      });
      wrap.appendChild(card);
    });
  }
  document.getElementById('btnAddSocial').addEventListener('click', function(){
    state.data.socials.push({ type: 'website', label: 'New link', url: '' });
    renderSocials();
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
