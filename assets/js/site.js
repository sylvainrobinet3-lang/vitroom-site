(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Menu mobile ---------- */
  var nav = $('#nav'), menuBtn = $('#menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  var loadedAt = Date.now();

  /* ---------- Avant / après ---------- */
  var ba = $('#ba-frame'), range = $('#ba-range');
  function setBA(v) { ba.style.setProperty('--pos', v + '%'); }
  if (ba && range) {
  range.addEventListener('input', function () { setBA(range.value); });
  ba.addEventListener('pointerdown', function (e) {
    var move = function (ev) { var r = ba.getBoundingClientRect(); var v = Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100)); range.value = Math.round(v); setBA(v); };
    move(e); ba.setPointerCapture(e.pointerId);
    var up = function () { ba.removeEventListener('pointermove', move); ba.removeEventListener('pointerup', up); };
    ba.addEventListener('pointermove', move); ba.addEventListener('pointerup', up);
  });
  }

  /* ---------- Exemples interactifs ---------- */
  var projects = {
    green: { title: 'Atelier Vert, paysagiste', colors: ['#2F5D3A', '#3E6E8E', '#8A5A2B'],
      points: ['Grandes photos de jardins dès l\'ouverture', 'Galerie avant / après par type de travaux', 'Zone d\'intervention et demande de devis avec photos du terrain'] },
    reno: { title: 'Maison Solide, rénovation', colors: ['#D08A2E', '#C2412D', '#3B82A0'],
      points: ['Ton sobre et rassurant, garanties en avant', 'Chantiers présentés étape par étape', 'Devis gratuit visible sur chaque page'] },
    resto: { title: 'La Table du Marché, restaurant', colors: ['#7A1F2B', '#2F4858', '#6B4E16'],
      points: ['Menu toujours à jour, lisible sur téléphone', 'Réservation en deux clics', 'Horaires, accès et parking clairement indiqués'] }
  };
  var state = { proj: 'green', device: 'desktop', color: {} };
  function renderStudio() {
    var p = projects[state.proj];
    $$('#stage [data-show]').forEach(function (el) { el.hidden = el.getAttribute('data-show') !== state.proj; });
    $('#stage-desktop').hidden = state.device !== 'desktop';
    $('#stage-phone').hidden = state.device !== 'phone';
    $$('.tab[data-proj]').forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('data-proj') === state.proj ? 'true' : 'false'); });
    $$('.seg [data-device]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-device') === state.device ? 'true' : 'false'); });
    var current = state.color[state.proj] || p.colors[0];
    $$('#stage [data-show="' + state.proj + '"] .mini').forEach(function (m) { m.style.setProperty('--m-accent', current); });
    var sw = $('#swatches'); sw.textContent = '';
    p.colors.forEach(function (c, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'swatch'; b.style.background = c;
      b.setAttribute('aria-label', 'Couleur ' + (i + 1)); b.setAttribute('aria-pressed', c === current ? 'true' : 'false');
      b.addEventListener('click', function () { state.color[state.proj] = c; renderStudio(); });
      sw.appendChild(b);
    });
    $('#proj-title').textContent = p.title;
    var ul = $('#proj-points'); ul.textContent = '';
    p.points.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
  }
  $$('.tab[data-proj]').forEach(function (t) { t.addEventListener('click', function () { state.proj = t.getAttribute('data-proj'); renderStudio(); }); });
  $$('.seg [data-device]').forEach(function (b) { b.addEventListener('click', function () { state.device = b.getAttribute('data-device'); renderStudio(); }); });
  if ($('#stage')) renderStudio();

  /* ---------- Copier ---------- */
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var el = document.getElementById(btn.getAttribute('data-copy')); var text = el.textContent.trim();
      var label = btn.textContent;
      var fallback = function () { var r = document.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Sélectionné'; };
      try { navigator.clipboard.writeText(text).then(function () { btn.textContent = 'Copié'; setTimeout(function () { btn.textContent = label; }, 1800); }, fallback); } catch (e) { fallback(); }
    });
  });

  /* ---------- Envoi des formulaires ----------
     Les demandes partent directement du site vers /api/contact.php (hébergement Hostinger),
     qui les vérifie puis les envoie par e-mail à Vitroom. Aucune clé ni secret dans ce fichier. */
  var cfg = window.VITROOM_CONFIG || {};
  function save(type, data, form) {
    var body = new URLSearchParams();
    body.append('formulaire', type);
    body.append('t', String(Date.now() - loadedAt));
    if (form) {
      var hp = form.querySelector('[name="site_web"]'); body.append('site_web', hp ? hp.value : '');
      var rg = form.querySelector('[name="rgpd"]'); body.append('rgpd', rg && rg.checked ? 'oui' : '');
      var ts = form.querySelector('[name="cf-turnstile-response"]'); if (ts) body.append('cf-turnstile-response', ts.value);
    }
    Object.keys(data).forEach(function (k) { var v = data[k]; body.append(k, Array.isArray(v) ? v.join(', ') : (v == null ? '' : String(v))); });
    return fetch('/api/contact.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'X-Requested-With': 'fetch' }, body: body.toString() })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }).then(function (j) { if (!r.ok || !j.ok) throw { code: 'send', message: j && j.message }; }); });
  }
  function saveErrorText(e) {
    if (e && e.message) return e.message;
    return 'L\'envoi n\'a pas abouti. Réessayez dans un instant, ou contactez-nous directement au 0470 53 70 08.';
  }
  function consentMsg(form) { var r = form.querySelector('[name="rgpd"]'); return r && !r.checked ? 'Cochez la case pour accepter l\'utilisation de vos données pour répondre à votre demande.' : ''; }
  var validMail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); };
  var validTel = function (v) { var s = v.replace(/[\s.\/()-]/g, ''); return /^(\+32|0032)[1-9]\d{7,8}$/.test(s) || /^0[1-9]\d{7,8}$/.test(s); };

  /* ---------- Formulaire de question ---------- */
  var qf = $('#q-form'), qErr = $('#q-error');
  if (qf) {
  qf.addEventListener('submit', function (e) {
    e.preventDefault();
    var nom = qf.nom.value.trim(), tel = qf.telephone.value.trim(), mail = qf.email.value.trim(), q = qf.question.value.trim();
    var msg = !nom ? 'Indiquez votre nom.' : (!validTel(tel) && !validMail(mail)) ? 'Indiquez un numéro de téléphone belge (ex. 0470 12 34 56) ou une adresse e-mail valide pour recevoir la réponse.' : !q ? 'Écrivez votre question.' : consentMsg(qf);
    qErr.textContent = msg; qErr.hidden = !msg;
    if (msg) return;
    var btn = $('#q-submit'); btn.disabled = true; btn.textContent = 'Envoi…';
    save('questions', { nom: nom, sujet: qf.sujet.value, telephone: tel, email: mail, question: q }, qf)
      .then(function () { qf.hidden = true; var d = $('#q-done'); d.hidden = false; d.focus(); qf.reset(); })
      .catch(function (err) { qErr.textContent = saveErrorText(err); qErr.hidden = false; })
      .then(function () { btn.disabled = false; btn.textContent = 'Envoyer ma question'; });
  });
  $('#q-again').addEventListener('click', function () { $('#q-done').hidden = true; qf.hidden = false; qf.nom.focus(); });
  }

  /* ---------- Formulaire de devis (3 étapes) ---------- */
  var df = $('#d-form'), dErr = $('#d-error'), step = 1;
  if (df) {
  function vals() {
    var g = function (n) { var el = df.querySelector('[name="' + n + '"]:checked'); return el ? el.value : ''; };
    var many = function (n) { return $$('[name="' + n + '"]:checked', df).map(function (i) { return i.value; }); };
    return { metier: df.metier.value, entreprise: df.entreprise.value.trim(), commune: df.commune.value.trim(), situation: g('situation'), existant: g('existant'),
      objectifs: many('objectifs'), taille: g('taille'), options: many('options'), delai: g('delai'),
      nom: df.nom.value.trim(), telephone: df.telephone.value.trim(), email: df.email.value.trim(), preference: g('preference'), message: df.message.value.trim() };
  }
  function renderRecap() {
    var v = vals(), dl = $('#recap'); dl.textContent = '';
    var rows = [['Activité', v.metier], ['Entreprise', v.entreprise], ['Commune', v.commune], ['Situation', v.situation + (v.existant ? ' · ' + v.existant : '')],
      ['Objectifs', v.objectifs.join(', ')], ['Taille', v.taille], ['Options', v.options.join(', ')], ['Délai', v.delai], ['Contact', v.preference && v.nom ? v.nom + ' · ' + v.preference : v.nom]];
    var any = false;
    rows.forEach(function (r) { if (!r[1]) return; any = true; var dt = document.createElement('dt'); dt.textContent = r[0]; var dd = document.createElement('dd'); dd.textContent = r[1]; dl.appendChild(dt); dl.appendChild(dd); });
    if (!any) { var p = document.createElement('div'); p.className = 'muted'; p.style.gridColumn = '1 / -1'; p.style.fontWeight = '400'; p.textContent = 'Vos réponses s\'affichent ici au fur et à mesure.'; dl.appendChild(p); }
  }
  function goStep(n) {
    step = n;
    $$('.d-step', df).forEach(function (s) { s.hidden = +s.getAttribute('data-step') !== n; });
    $$('.progress li', df).forEach(function (li, i) { li.setAttribute('data-state', i + 1 < n ? 'done' : i + 1 === n ? 'current' : ''); });
    $('#d-prev').hidden = n === 1; $('#d-next').hidden = n === 3; $('#d-submit').hidden = n !== 3;
    dErr.hidden = true;
    var first = $('.d-step[data-step="' + n + '"] h2', df); if (first) { first.setAttribute('tabindex', '-1'); first.focus({ preventScroll: true }); }
    df.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function check(n) {
    var v = vals();
    if (n === 1) { if (!v.metier) return 'Choisissez votre activité.'; if (!v.situation) return 'Indiquez ce que vous avez aujourd\'hui.'; }
    if (n === 2) { if (!v.objectifs.length) return 'Choisissez au moins un objectif pour votre site.'; }
    if (n === 3) { if (!v.nom) return 'Indiquez votre nom.'; if (v.telephone && !validTel(v.telephone)) return 'Le numéro de téléphone ne semble pas valide (ex. 0470 12 34 56 ou +32 470 12 34 56).'; if (v.email && !validMail(v.email)) return 'L\'adresse e-mail ne semble pas valide.'; if (!v.telephone && !v.email) return 'Indiquez un numéro de téléphone ou une adresse e-mail.'; var c = consentMsg(df); if (c) return c; }
    return '';
  }
  $('#d-next').addEventListener('click', function () { var m = check(step); dErr.textContent = m; dErr.hidden = !m; if (!m) goStep(step + 1); });
  $('#d-prev').addEventListener('click', function () { goStep(step - 1); });
  df.addEventListener('input', renderRecap); df.addEventListener('change', renderRecap);
  df.addEventListener('submit', function (e) {
    e.preventDefault();
    if (step !== 3) { $('#d-next').click(); return; }
    var m = check(3); dErr.textContent = m; dErr.hidden = !m; if (m) return;
    var btn = $('#d-submit'); btn.disabled = true; btn.textContent = 'Envoi…';
    var v = vals();
    save('devis', v, df).then(function () {
      df.hidden = true; var d = $('#d-done'); d.hidden = false;
      $('#d-done-txt').textContent = 'Vous êtes recontacté rapidement par ' + (v.preference || 'téléphone').toLowerCase().replace('e-mail', 'e-mail') + ' pour en parler.';
      d.focus(); df.reset(); renderRecap(); goStep(1);
    }).catch(function (err) { dErr.textContent = saveErrorText(err); dErr.hidden = false; })
      .then(function () { btn.disabled = false; btn.textContent = 'Envoyer ma demande'; });
  });
  renderRecap();
  }

  /* =========================================================
     CALCULATEUR DE RENTABILITÉ
     ========================================================= */
  (function () {
    var presets = [
      ['Paysagiste', 2500, 30, 'Montant moyen d\'un chantier.'],
      ['Rénovation', 8000, 20, 'Montant moyen d\'un chantier.'],
      ['Toiture', 6000, 25, 'Montant moyen d\'un chantier.'],
      ['Salle de réception', 4000, 30, 'Montant moyen d\'un événement.'],
      ['Coiffure', 240, 50, 'Ce que dépense un client fidèle sur un an.'],
      ['Restaurant', 350, 25, 'Ce que dépense un client régulier sur un an.']
    ];
    var box = $('#presets'); if (!box) return;
    var val = $('#c-val'), marge = $('#c-marge'), mois = $('#c-mois'), budget = $('#c-budget');
    var euro = function (n) { return Math.round(n).toLocaleString('fr-BE') + ' €'; };
    presets.forEach(function (p, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chip-btn'; b.textContent = p[0];
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        val.value = p[1]; marge.value = p[2]; $('#c-val-hint').textContent = p[3];
        $$('.chip-btn', box).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        calc();
      });
      box.appendChild(b);
    });
    function calc() {
      var v = Math.max(0, +val.value || 0), m = +marge.value, n = +mois.value, bud = Math.max(0, +budget.value || 0);
      $('#c-marge-v').textContent = m + ' %'; $('#c-mois-v').textContent = n;
      var profit = v * m / 100;
      var need = profit > 0 ? Math.max(1, Math.ceil(bud / profit)) : null;
      var months = need && n > 0 ? Math.ceil(need / n) : null;
      var gain = n * 12 * profit - bud;
      $('#r-clients').textContent = need === null ? '—' : need;
      $('#r-clients-l').textContent = need === 1 ? 'client' : 'clients';
      $('#r-profit').textContent = euro(profit);
      $('#r-mois').textContent = months === null ? '—' : months > 12 ? 'plus de 12 mois' : months + ' mois';
      $('#r-gain').textContent = (gain >= 0 ? '+ ' : '− ') + euro(Math.abs(gain));
      var row = $('#r-months'); row.textContent = '';
      for (var i = 1; i <= 12; i++) {
        var cum = n * i * profit - bud, c = document.createElement('span');
        c.className = cum >= 0 ? 'pos' : 'neg'; c.textContent = 'M' + i; row.appendChild(c);
      }
      var s = '';
      if (need === null) s = 'Indiquez un montant et une marge pour voir le résultat.';
      else if (n === 0) s = 'Il suffit de ' + need + (need === 1 ? ' nouveau client' : ' nouveaux clients') + ' trouvés grâce au site pour qu\'il soit remboursé.';
      else s = 'À ' + n + (n === 1 ? ' nouveau client' : ' nouveaux clients') + ' par mois, le site est remboursé ' + (months > 12 ? 'en plus d\'un an' : 'en ' + months + ' mois') + (gain > 0 ? ', puis il vous rapporte environ ' + euro(gain) + ' de bénéfice sur la première année.' : '.');
      $('#r-sentence').textContent = s;
    }
    [val, marge, mois, budget].forEach(function (el) { el.addEventListener('input', calc); });
    calc();
  })();

  /* =========================================================
     DIAGNOSTIC GRATUIT
     ========================================================= */
  var quizAnswers = {};
  var QUIZ = [
    ['site', 'Avez-vous un site internet à votre nom ?', 'Créez un site à votre nom : c\'est votre adresse en ligne, que ni Facebook ni un annuaire ne remplacent.'],
    ['google', 'Quand on cherche votre métier et votre commune sur Google, apparaissez-vous en première page ?', 'Travaillez votre visibilité locale : des pages qui citent votre métier et votre commune, et une fiche Google complète.'],
    ['fiche', 'Avez-vous une fiche Google avec vos horaires et des photos ?', 'Complétez votre fiche Google : horaires, photos, services. C\'est souvent elle qui apparaît en premier.'],
    ['avis', 'Avez-vous des avis Google récents ?', 'Demandez un avis à vos clients satisfaits juste après un chantier ou une visite.'],
    ['mobile', 'Votre site s\'affiche-t-il bien sur téléphone, sans zoomer ?', 'Rendez votre site lisible sur téléphone : la plupart de vos visiteurs arrivent par là.'],
    ['tel', 'Votre numéro est-il visible et cliquable en haut de chaque page ?', 'Placez un bouton d\'appel bien visible sur chaque page.'],
    ['real', 'Montrez-vous des photos de vos réalisations ?', 'Ajoutez des photos de vos chantiers ou produits : rien ne convainc mieux.'],
    ['devis', 'Un client peut-il demander un devis ou vous écrire depuis le site ?', 'Ajoutez un formulaire de devis simple : certains clients préfèrent écrire qu\'appeler.'],
    ['maj', 'Votre site a-t-il été mis à jour cette année ?', 'Mettez à jour vos services, horaires et photos : un site figé inquiète les clients.'],
    ['vite', 'Votre site s\'ouvre-t-il en moins de 3 secondes sur téléphone ?', 'Allégez votre site : au-delà de quelques secondes, beaucoup de visiteurs repartent.']
  ];
  (function () {
    var ol = $('#quiz'); if (!ol) return;
    QUIZ.forEach(function (q, i) {
      var li = document.createElement('li'); li.className = 'q';
      var p = document.createElement('p'); p.className = 'q-t'; p.id = 'q-' + q[0]; p.textContent = q[1];
      var g = document.createElement('div'); g.className = 'q-a'; g.setAttribute('role', 'radiogroup'); g.setAttribute('aria-labelledby', 'q-' + q[0]);
      [['oui', 'Oui'], ['non', 'Non'], ['nsp', 'Je ne sais pas']].forEach(function (a) {
        var l = document.createElement('label');
        var r = document.createElement('input'); r.type = 'radio'; r.name = 'quiz-' + q[0]; r.value = a[0];
        r.addEventListener('change', function () { quizAnswers[q[0]] = a[0]; scoreQuiz(); });
        var s = document.createElement('span'); s.textContent = a[1];
        l.appendChild(r); l.appendChild(s); g.appendChild(l);
      });
      li.appendChild(p); li.appendChild(g); ol.appendChild(li);
    });
    scoreQuiz();
  })();
  function scoreQuiz() {
    var answered = Object.keys(quizAnswers).length;
    var score = QUIZ.filter(function (q) { return quizAnswers[q[0]] === 'oui'; }).length;
    $('#score').textContent = score; $('#ring').style.setProperty('--p', score * 10);
    $('#score-count').textContent = answered + (answered > 1 ? ' réponses' : ' réponse') + ' sur 10';
    var level = answered === 0 ? 'Répondez aux questions' : score >= 8 ? 'Une présence solide' : score >= 5 ? 'Des bases à renforcer' : 'Une présence à construire';
    $('#score-level').textContent = level;
    var tips = QUIZ.filter(function (q) { return quizAnswers[q[0]] === 'non' || quizAnswers[q[0]] === 'nsp'; }).slice(0, 4);
    var ul = $('#tips-list'); ul.textContent = '';
    tips.forEach(function (q) { var li = document.createElement('li'); li.textContent = q[2]; ul.appendChild(li); });
    $('#tips').hidden = !tips.length;
    var s = $('#g-quiz-s'); if (s) s.textContent = answered ? 'Score ' + score + ' / 10 (' + answered + ' réponses)' : 'Aucune réponse pour l\'instant';
  }
  (function () {
    var gf = $('#g-form'); if (!gf) return;
    var gErr = $('#g-error');
    gf.addEventListener('submit', function (e) {
      e.preventDefault();
      var nom = gf.nom.value.trim(), contact = gf.contact.value.trim();
      var msg = !nom ? 'Indiquez votre nom.' : (!validTel(contact) && !validMail(contact)) ? 'Indiquez un numéro de téléphone belge (ex. 0470 12 34 56) ou une adresse e-mail valide.' : consentMsg(gf);
      gErr.textContent = msg; gErr.hidden = !msg; if (msg) return;
      var data = { nom: nom, contact: contact, lien: gf.lien.value.trim(), entreprise: gf.entreprise.value.trim(), commune: gf.commune.value.trim(), metier: gf.metier.value.trim() };
      if ($('#g-quiz').checked && Object.keys(quizAnswers).length) {
        data.score = QUIZ.filter(function (q) { return quizAnswers[q[0]] === 'oui'; }).length + ' / 10';
        data.points = QUIZ.filter(function (q) { return quizAnswers[q[0]] && quizAnswers[q[0]] !== 'oui'; }).map(function (q) { return '• ' + q[1] + ' → ' + (quizAnswers[q[0]] === 'non' ? 'non' : 'ne sait pas'); }).join('\n');
      }
      var btn = $('#g-submit'); btn.disabled = true; btn.textContent = 'Envoi…';
      save('diagnostics', data, gf).then(function () { gf.hidden = true; var d = $('#g-done'); d.hidden = false; d.focus(); gf.reset(); })
        .catch(function (err) { gErr.textContent = saveErrorText(err); gErr.hidden = false; })
        .then(function () { btn.disabled = false; btn.textContent = 'Demander mon diagnostic'; });
    });
  })();

  /* ---------- Devis : choix pour un site existant ---------- */
  (function () {
    var box = $('#d-existing'); if (!box) return;
    $$('#d-form [name="situation"]').forEach(function (r) {
      r.addEventListener('change', function () { box.hidden = r.value !== 'Un site à refaire' || !r.checked; });
    });
  })();

  /* =========================================================
     SITES D'EXEMPLE (entreprises fictives)
     ========================================================= */
  var DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  function hm(m) { var h = Math.floor(m / 60), mm = m % 60; return h + ':' + (mm < 10 ? '0' : '') + mm; }

  // Défilement interne des exemples
  $$('[data-scroll]').forEach(function (b) {
    b.addEventListener('click', function () {
      var el = document.getElementById(b.getAttribute('data-scroll'));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Message pour les faux boutons d'appel
  var toast = $('#demo-toast'), toastTimer;
  $$('[data-fake-call]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!toast) return;
      toast.textContent = 'Exemple : sur le vrai site, ce bouton appelle directement l\'entreprise.';
      toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.hidden = true; }, 3200);
    });
  });

  // Horaires + « ouvert maintenant »
  $$('[data-hours]').forEach(function (box) {
    var sched; try { sched = JSON.parse(box.getAttribute('data-hours')); } catch (e) { return; }
    var now = new Date(), d = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
    var table = $('[data-table]', box), status = $('[data-status]', box);
    [1, 2, 3, 4, 5, 6, 0].forEach(function (k) {
      var tr = document.createElement('tr'); if (k === d) tr.className = 'today';
      var a = document.createElement('td'); a.textContent = DAYS[k];
      var b = document.createElement('td');
      var r = sched[k]; b.textContent = r ? r.map(function (x) { return hm(x[0]) + ' – ' + hm(x[1]); }).join(' · ') : 'Fermé';
      tr.appendChild(a); tr.appendChild(b); table.appendChild(tr);
    });
    var today = sched[d] || [], openNow = null;
    today.forEach(function (x) { if (mins >= x[0] && mins < x[1]) openNow = x; });
    if (openNow) { status.textContent = 'Ouvert maintenant · ferme à ' + hm(openNow[1]); status.classList.add('open'); return; }
    var later = today.filter(function (x) { return x[0] > mins; })[0];
    if (later) { status.textContent = 'Fermé · ouvre aujourd\'hui à ' + hm(later[0]); return; }
    for (var i = 1; i <= 7; i++) { var k2 = (d + i) % 7; if (sched[k2]) { status.textContent = 'Fermé · ouvre ' + (i === 1 ? 'demain' : DAYS[k2].toLowerCase()) + ' à ' + hm(sched[k2][0][0]); return; } }
  });

  // Curseur avant / après générique
  function slider(frame, input) {
    var set = function (v) { frame.style.setProperty('--pos', v + '%'); };
    input.addEventListener('input', function () { set(input.value); });
    frame.addEventListener('pointerdown', function (e) {
      var move = function (ev) { var r = frame.getBoundingClientRect(); var v = Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100)); input.value = Math.round(v); set(v); };
      move(e); frame.setPointerCapture(e.pointerId);
      var up = function () { frame.removeEventListener('pointermove', move); frame.removeEventListener('pointerup', up); };
      frame.addEventListener('pointermove', move); frame.addEventListener('pointerup', up);
    });
  }

  /* ---------- Atelier Vert (paysagiste) ---------- */
  (function () {
    var root = $('.dj'); if (!root) return;
    $$('.filters button', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-f');
        $$('.filters button', root).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        $$('#dj-gal figure', root).forEach(function (fig) { fig.hidden = !(f === 'tous' || fig.getAttribute('data-k') === f); });
      });
    });
    slider($('#dj-abf'), $('#dj-range'));
    var surf = $('#dj-surf'), surfV = $('#dj-surf-v');
    surf.addEventListener('input', function () { surfV.textContent = (+surf.value).toLocaleString('fr-BE') + ' m²'; });
    var photos = $('#dj-photos'), thumbs = $('#dj-thumbs');
    photos.addEventListener('change', function () {
      thumbs.textContent = '';
      Array.prototype.slice.call(photos.files, 0, 6).forEach(function (file) {
        var img = document.createElement('img'); img.alt = 'Photo ajoutée : ' + file.name; img.src = URL.createObjectURL(file); thumbs.appendChild(img);
      });
    });
    $('#dj-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var types = $$('#dj-form input[name="t"]:checked').map(function (i) { return i.value.toLowerCase(); });
      var nom = $('#dj-nom').value.trim(), tel = $('#dj-tel').value.trim(), err = $('#dj-err');
      var m = !types.length ? 'Choisissez au moins un type de travaux.' : !nom ? 'Indiquez votre nom.' : tel.replace(/\D/g, '').length < 9 ? 'Indiquez un numéro de téléphone valide.' : '';
      err.textContent = m; err.hidden = !m; if (m) return;
      $('#dj-form').hidden = true;
      $('#dj-ok-t').textContent = nom + ', votre demande (' + types.join(', ') + ', environ ' + surfV.textContent + (photos.files.length ? ', ' + photos.files.length + ' photo(s)' : '') + ') est prête à être envoyée. Rappel prévu au ' + tel + '.';
      var ok = $('#dj-ok'); ok.hidden = false; ok.focus();
    });
  })();

  /* ---------- Studio Lumen (coiffure, rendez-vous) ---------- */
  (function () {
    var root = $('.dc'); if (!root) return;
    var services = {
      femme: [['Coupe et brushing', 45, 38], ['Couleur racines', 60, 49], ['Balayage', 120, 95], ['Brushing', 30, 25]],
      homme: [['Coupe homme', 30, 22], ['Coupe et barbe', 45, 32], ['Taille de barbe', 20, 15]],
      soins: [['Soin du visage', 60, 55], ['Manucure', 45, 30], ['Épilation sourcils', 15, 12]]
    };
    var list = $('#dc-prices');
    function showCat(c) {
      $$('.tabs button', root).forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-cat') === c ? 'true' : 'false'); });
      list.textContent = '';
      services[c].forEach(function (s) {
        var li = document.createElement('li');
        var n = document.createElement('span'); n.textContent = s[0];
        var t = document.createElement('small'); t.textContent = s[1] + ' min';
        var p = document.createElement('b'); p.textContent = s[2] + ' €';
        li.appendChild(n); li.appendChild(t); li.appendChild(p); list.appendChild(li);
      });
    }
    $$('.tabs button', root).forEach(function (b) { b.addEventListener('click', function () { showCat(b.getAttribute('data-cat')); }); });
    showCat('femme');

    var hoursMap = { 2: [540, 1110], 3: [540, 1110], 4: [540, 1200], 5: [540, 1110], 6: [510, 960] };
    var st = { step: 1, svc: null, day: null, slot: null };
    var all = [].concat(services.femme, services.homme, services.soins);
    var opts = $('#dc-opts');
    all.forEach(function (s, i) {
      var l = document.createElement('label'); l.className = 'opt';
      var r = document.createElement('input'); r.type = 'radio'; r.name = 'dc-svc'; r.value = i;
      var t = document.createElement('span'); t.innerHTML = ''; var bb = document.createElement('b'); bb.textContent = s[0]; var sm = document.createElement('small'); sm.textContent = ' · ' + s[1] + ' min'; t.appendChild(bb); t.appendChild(sm);
      var p = document.createElement('b'); p.textContent = s[2] + ' €';
      r.addEventListener('change', function () { st.svc = i; st.slot = null; sum(); });
      l.appendChild(r); l.appendChild(t); l.appendChild(p); opts.appendChild(l);
    });
    var days = $('#dc-days'), base = new Date(); base.setHours(0, 0, 0, 0);
    for (var i = 0; i < 14; i++) {
      (function (i) {
        var d = new Date(base); d.setDate(base.getDate() + i);
        var b = document.createElement('button'); b.type = 'button'; b.className = 'day'; b.setAttribute('aria-pressed', 'false');
        var top = document.createElement('span'); top.textContent = d.toLocaleDateString('fr-BE', { weekday: 'short' });
        var bot = document.createElement('small'); bot.textContent = d.toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' });
        b.appendChild(top); b.appendChild(bot);
        if (!hoursMap[d.getDay()]) b.disabled = true;
        b.addEventListener('click', function () { st.day = d; st.slot = null; $$('.day', days).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); sum(); });
        days.appendChild(b);
      })(i);
    }
    function taken(d, m) { var x = (d.getDate() * 31 + d.getMonth() * 7 + m / 30) % 5; return x < 1.6; }
    function slots() {
      var box = $('#dc-slots'); box.textContent = '';
      var h = hoursMap[st.day.getDay()], dur = all[st.svc][1], now = new Date();
      for (var m = h[0]; m + dur <= h[1]; m += 30) {
        (function (m) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'slot'; b.textContent = hm(m);
          var past = st.day.toDateString() === now.toDateString() && m <= now.getHours() * 60 + now.getMinutes() + 30;
          b.disabled = past || taken(st.day, m); b.setAttribute('aria-pressed', st.slot === m ? 'true' : 'false');
          if (b.disabled) b.setAttribute('aria-label', hm(m) + ', indisponible');
          b.addEventListener('click', function () { st.slot = m; $$('.slot', box).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); sum(); });
          box.appendChild(b);
        })(m);
      }
    }
    function sum() {
      var dl = $('#dc-sum'); dl.textContent = '';
      var rows = [['Prestation', st.svc !== null ? all[st.svc][0] + ' (' + all[st.svc][2] + ' €)' : '—'],
        ['Jour', st.day ? st.day.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'],
        ['Heure', st.slot !== null ? hm(st.slot) : '—'], ['Durée', st.svc !== null ? all[st.svc][1] + ' min' : '—']];
      rows.forEach(function (r) { var dt = document.createElement('dt'); dt.textContent = r[0]; var dd = document.createElement('dd'); dd.textContent = r[1]; dl.appendChild(dt); dl.appendChild(dd); });
    }
    function go(n) {
      st.step = n;
      $$('[data-s]', root).forEach(function (s) { s.hidden = +s.getAttribute('data-s') !== n; });
      $$('#dc-steps li').forEach(function (li, i) { li.className = i + 1 < n ? 'done' : i + 1 === n ? 'on' : ''; });
      $('#dc-prev').hidden = n === 1 || n === 5; $('#dc-next').hidden = n === 5;
      $('#dc-next').textContent = n === 4 ? 'Confirmer le rendez-vous' : 'Continuer →';
      $('#dc-err').hidden = true;
      if (n === 3) slots();
    }
    $('#dc-next').addEventListener('click', function () {
      var e = '';
      if (st.step === 1 && st.svc === null) e = 'Choisissez une prestation.';
      if (st.step === 2 && !st.day) e = 'Choisissez un jour.';
      if (st.step === 3 && st.slot === null) e = 'Choisissez une heure.';
      if (st.step === 4) { if (!$('#dc-nom').value.trim()) e = 'Indiquez votre nom.'; else if ($('#dc-tel').value.replace(/\D/g, '').length < 9) e = 'Indiquez un numéro de mobile valide.'; }
      var er = $('#dc-err'); er.textContent = e; er.hidden = !e; if (e) return;
      if (st.step === 4) {
        $('#dc-ok-t').textContent = $('#dc-nom').value.trim() + ', rendez-vous le ' + st.day.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' }) + ' à ' + hm(st.slot) + ' pour « ' + all[st.svc][0] + ' ». Un SMS de rappel est envoyé la veille.';
        go(5); $('#dc-ok').focus(); return;
      }
      go(st.step + 1);
    });
    $('#dc-prev').addEventListener('click', function () { go(st.step - 1); });
    sum(); go(1);
  })();

  /* ---------- La Table du Marché (restaurant) ---------- */
  (function () {
    var root = $('.dr'); if (!root) return;
    var menu = {
      entrees: [['Velouté de potimarron, noisettes torréfiées', 'Crème fermière, huile de noisette.', 11, ['vege', 'sg']], ['Croquettes aux crevettes grises', 'Deux pièces, persil frit, citron.', 16, []], ['Tartare de bœuf du Hainaut', 'Câpres, échalote, jaune d\'œuf confit.', 15, ['sg']], ['Burrata et betteraves rôties', 'Pesto de fanes, pain grillé.', 14, ['vege']]],
      plats: [['Carbonnade à la bière d\'abbaye', 'Frites maison, salade de saison.', 24, []], ['Filet de cabillaud, beurre blanc', 'Poireaux fondants, pommes grenaille.', 27, ['sg']], ['Risotto aux champignons des bois', 'Parmesan affiné, roquette.', 21, ['vege', 'sg']], ['Suprême de volaille fermière', 'Chicons braisés, sauce au maroilles.', 25, []]],
      desserts: [['Dame blanche', 'Glace vanille, chocolat chaud.', 9, ['vege', 'sg']], ['Tarte au sucre et glace speculoos', '', 9, ['vege']], ['Moelleux au chocolat', 'Cœur coulant, crème anglaise.', 10, ['vege']], ['Assiette de fromages belges', 'Trois fromages, confiture de figues.', 12, ['vege']]]
    };
    var st = { cat: 'entrees', diet: {}, sv: 'midi', n: 2, time: null };
    function renderMenu() {
      $$('.cats button', root).forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-c') === st.cat ? 'true' : 'false'); });
      var ul = $('#dr-dishes'); ul.textContent = '';
      var items = menu[st.cat].filter(function (d) { return Object.keys(st.diet).every(function (k) { return !st.diet[k] || d[3].indexOf(k) >= 0; }); });
      if (!items.length) { var li = document.createElement('li'); li.className = 'empty-d'; li.textContent = 'Aucun plat ne correspond à ces filtres dans cette catégorie.'; ul.appendChild(li); return; }
      items.forEach(function (d) {
        var li = document.createElement('li');
        var n = document.createElement('b'); n.textContent = d[0];
        var p = document.createElement('span'); p.className = 'p'; p.textContent = d[2] + ' €';
        li.appendChild(n); li.appendChild(p);
        if (d[1]) { var de = document.createElement('span'); de.className = 'd'; de.textContent = d[1]; li.appendChild(de); }
        if (d[3].length) { var tg = document.createElement('span'); tg.className = 'tg'; d[3].forEach(function (k) { var s = document.createElement('span'); s.textContent = k === 'vege' ? 'Végétarien' : 'Sans gluten'; tg.appendChild(s); }); li.appendChild(tg); }
        ul.appendChild(li);
      });
    }
    $$('.cats button', root).forEach(function (b) { b.addEventListener('click', function () { st.cat = b.getAttribute('data-c'); renderMenu(); }); });
    $$('.diet button', root).forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-d'); st.diet[k] = !st.diet[k]; b.setAttribute('aria-pressed', st.diet[k] ? 'true' : 'false'); renderMenu(); }); });
    renderMenu();

    var open = { 2: ['midi', 'soir'], 3: ['midi', 'soir'], 4: ['midi', 'soir'], 5: ['midi', 'soir'], 6: ['soir'] };
    var ranges = { midi: [720, 810], soir: [1110, 1290] };
    var dateIn = $('#dr-date'), today = new Date();
    var iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    dateIn.min = iso(today);
    var first = new Date(today); while (!open[first.getDay()]) first.setDate(first.getDate() + 1);
    dateIn.value = iso(first);
    function times() {
      var box = $('#dr-times'); box.textContent = '';
      var parts = dateIn.value.split('-'), d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      var services = open[d.getDay()] || [];
      $('#dr-closed').hidden = !!services.length;
      $$('.seg2 button', root).forEach(function (b) { var ok = services.indexOf(b.getAttribute('data-sv')) >= 0; b.disabled = !ok; });
      if (services.indexOf(st.sv) < 0 && services.length) st.sv = services[0];
      $$('.seg2 button', root).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-sv') === st.sv ? 'true' : 'false'); });
      if (!services.length) { st.time = null; return; }
      var r = ranges[st.sv];
      for (var m = r[0]; m <= r[1]; m += 15) {
        (function (m) {
          var b = document.createElement('button'); b.type = 'button'; b.textContent = hm(m);
          var full = ((d.getDate() + m / 15 + st.n) % 7) < 1.5 && st.n > 4;
          b.disabled = full; b.setAttribute('aria-pressed', st.time === m ? 'true' : 'false');
          b.addEventListener('click', function () { st.time = m; $$('button', box).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); });
          box.appendChild(b);
        })(m);
      }
    }
    dateIn.addEventListener('change', function () { st.time = null; times(); });
    $$('.seg2 button', root).forEach(function (b) { b.addEventListener('click', function () { st.sv = b.getAttribute('data-sv'); st.time = null; times(); }); });
    var out = $('#dr-n');
    function setN(n) { st.n = Math.max(1, Math.min(10, n)); out.textContent = st.n + (st.n > 1 ? ' pers.' : ' pers.'); times(); }
    $('#dr-minus').addEventListener('click', function () { setN(st.n - 1); });
    $('#dr-plus').addEventListener('click', function () { setN(st.n + 1); });
    times();
    $('#dr-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var nom = $('#dr-nom').value.trim(), tel = $('#dr-tel').value.trim(), err = $('#dr-err');
      var m = !dateIn.value ? 'Choisissez une date.' : st.time === null ? 'Choisissez une heure.' : !nom ? 'Indiquez votre nom.' : tel.replace(/\D/g, '').length < 9 ? 'Indiquez un numéro de téléphone valide.' : '';
      err.textContent = m; err.hidden = !m; if (m) return;
      var parts = dateIn.value.split('-'), d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      $('#dr-ok-t').textContent = 'Table pour ' + st.n + ' le ' + d.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' }) + ' à ' + hm(st.time) + ', au nom de ' + nom + '.';
      var ok = $('#dr-ok'); ok.hidden = false; ok.focus();
    });
  })();

  /* ---------- Cookies et mesure d'audience ----------
     Aucun cookie ni mesure d'audience avant accord. Outil prévu : Cloudflare Web Analytics (sans cookie),
     activé seulement si un jeton est renseigné dans VITROOM_CONFIG.analyticsToken et si le visiteur accepte. */
  var CONSENT_KEY = 'vitroom-consent';
  function getConsent() { try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } }
  function setConsent(v) { try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {} }
  function loadAnalytics() {
    if (!cfg.analyticsToken || document.getElementById('cf-beacon')) return;
    var s = document.createElement('script'); s.id = 'cf-beacon'; s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({ token: cfg.analyticsToken }));
    document.head.appendChild(s);
  }
  var banner = $('#cookie-banner');
  function openBanner(details) {
    if (!banner) return;
    banner.hidden = false;
    var box = $('#cookie-details'); if (box) box.hidden = !details;
    var cb = $('#cookie-stats'); if (cb) cb.checked = getConsent() === 'oui';
  }
  function closeBanner(v) { setConsent(v); if (banner) banner.hidden = true; if (v === 'oui') loadAnalytics(); }
  if (banner) {
    $('#cookie-accept').addEventListener('click', function () { closeBanner('oui'); });
    $('#cookie-refuse').addEventListener('click', function () { closeBanner('non'); });
    $('#cookie-settings').addEventListener('click', function () { var b = $('#cookie-details'); b.hidden = !b.hidden; });
    $('#cookie-save').addEventListener('click', function () { closeBanner($('#cookie-stats').checked ? 'oui' : 'non'); });
  }
  $$('[data-cookie-settings]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); openBanner(true); }); });
  var c0 = getConsent();
  if (c0 === 'oui') loadAnalytics(); else if (!c0 && cfg.analyticsToken) openBanner(false);  // sans outil de mesure actif, rien à demander

  /* ---------- Anti-spam Cloudflare Turnstile (si une clé de site est renseignée) ---------- */
  if (cfg.turnstileSiteKey && $('[data-turnstile]')) {
    $$('[data-turnstile]').forEach(function (el) { el.className = 'cf-turnstile'; el.setAttribute('data-sitekey', cfg.turnstileSiteKey); el.setAttribute('data-language', 'fr'); });
    var t = document.createElement('script'); t.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; t.async = true; t.defer = true; document.head.appendChild(t);
  }
})();
