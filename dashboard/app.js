/* Token Radar — the page. One dataset (window.RADAR, written by main.ts), no network. */
(function () {
  'use strict';
  var D = window.RADAR;
  var view = document.getElementById('view');
  var stats = document.getElementById('stats');
  var PAGE = 25;

  /* ---------- formatting ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) {
    if (n == null || !isFinite(n)) return '—';
    var a = Math.abs(n);
    if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function moneyFull(n) {
    return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function pct(n) {
    if (n == null || !isFinite(n)) return '—';
    var s = (n > 0 ? '+' : '') + n.toFixed(1) + '%';
    return s;
  }
  function pctCls(n) { return n == null ? '' : n >= 0 ? 'up' : 'down'; }
  function ageFmt(days) {
    if (days == null) return '—';
    if (days < 30) return days + 'd';
    if (days < 365) return (days / 30).toFixed(1) + 'mo';
    return (days / 365).toFixed(1) + 'y';
  }
  function num(n) { return n == null ? '—' : n.toFixed(3); }

  /* ---------- state from the hash ---------- */
  function hashState() {
    var h = (location.hash || '').replace(/^#/, '');
    var st = { view: 'board', slug: '', cat: '', chain: '', q: '', watch: false, sort: 'rank', page: 1 };
    if (!h) return st;
    var parts = h.split('&');
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split('=');
      var k = kv[0], v = decodeURIComponent(kv[1] || '');
      if (k === 'detail') { st.view = 'detail'; st.slug = v; }
      else if (k === 'view') st.view = v;
      else if (k === 'cat') st.cat = v;
      else if (k === 'chain') st.chain = v;
      else if (k === 'q') st.q = v;
      else if (k === 'watch') st.watch = v === '1';
      else if (k === 'sort') st.sort = v;
      else if (k === 'page') st.page = Math.max(1, parseInt(v, 10) || 1);
    }
    return st;
  }
  function setHash(st) {
    var bits = [];
    if (st.view === 'detail') bits.push('detail=' + encodeURIComponent(st.slug));
    else if (st.view !== 'board') bits.push('view=' + st.view);
    if (st.cat) bits.push('cat=' + encodeURIComponent(st.cat));
    if (st.chain) bits.push('chain=' + encodeURIComponent(st.chain));
    if (st.q) bits.push('q=' + encodeURIComponent(st.q));
    if (st.watch) bits.push('watch=1');
    if (st.sort && st.sort !== 'rank') bits.push('sort=' + st.sort);
    if (st.page > 1) bits.push('page=' + st.page);
    var h = bits.length ? '#' + bits.join('&') : '#';
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  /* ---------- stats bar ---------- */
  function renderStats() {
    var watch = D.rows.filter(function (r) { return D.watchlist.indexOf(r.slug) >= 0; }).length;
    stats.innerHTML =
      stat(money(D.total_implied_usd), 'total implied value') +
      stat(D.board_size + ' rows', 'ranked pre-token') +
      stat(watch + ' / ' + D.watchlist_size, 'watchlist covered') +
      stat(num(D.global_multiple) + '×', 'market median multiple') +
      stat(D.protocols_scanned + ' protocols', 'scanned in snapshot') +
      stat(D.as_of, 'snapshot date');
    function stat(b, s) { return '<div class="stat"><b>' + esc(b) + '</b><span>' + esc(s) + '</span></div>'; }
  }

  /* ---------- board ---------- */
  function boardRows(st) {
    var rows = D.rows.filter(function (r) {
      if (st.watch && D.watchlist.indexOf(r.slug) < 0) return false;
      if (st.cat && r.category !== st.cat) return false;
      if (st.chain && r.chains.indexOf(st.chain) < 0) return false;
      if (st.q) {
        var q = st.q.toLowerCase();
        if (r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    });
    var sorters = {
      rank: function (a, b) { return a.rank - b.rank; },
      implied: function (a, b) { return b.implied_value_usd - a.implied_value_usd; },
      tvl: function (a, b) { return b.tvl_usd - a.tvl_usd; },
      growth: function (a, b) { return (b.change_7d == null ? -1e9 : b.change_7d) - (a.change_7d == null ? -1e9 : a.change_7d); },
      age: function (a, b) { return (b.age_days == null ? -1 : b.age_days) - (a.age_days == null ? -1 : a.age_days); }
    };
    rows.sort(sorters[st.sort] || sorters.rank);
    return rows;
  }
  function categories() {
    var s = {};
    D.rows.forEach(function (r) { if (r.category) s[r.category] = 1; });
    return Object.keys(s).sort();
  }
  function chains() {
    var s = {};
    D.rows.forEach(function (r) { r.chains.forEach(function (c) { s[c] = 1; }); });
    return Object.keys(s).sort();
  }
  function options(list, cur, all) {
    return '<option value="">' + esc(all) + '</option>' + list.map(function (v) {
      return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(v) + '</option>';
    }).join('');
  }
  function renderBoard(st) {
    var rows = boardRows(st);
    var pages = Math.max(1, Math.ceil(rows.length / PAGE));
    var page = Math.min(st.page, pages);
    var slice = rows.slice((page - 1) * PAGE, page * PAGE);
    var maxImp = D.rows.length ? D.rows[0].implied_value_usd : 1;
    var h = '<section class="panel"><h2>The board</h2>' +
      '<p class="lede">Every protocol the snapshot shows as a genuine pre-token launch candidate, ranked by ' +
      'implied launch value. The watchlist is the floor — ' + D.watchlist_size + ' protocols at or above ' +
      money(D.floor_usd) + ' of TVL with no token recorded — and the board adds ' + D.early_size +
      ' more below it. Click a row for its model and farm plan.</p>' +
      '<div class="filters">' +
      '<input type="search" id="fq" placeholder="Search name or slug…" value="' + esc(st.q) + '" aria-label="Search">' +
      '<select id="fcat" aria-label="Category">' + options(categories(), st.cat, 'All categories') + '</select>' +
      '<select id="fchain" aria-label="Chain">' + options(chains(), st.chain, 'All chains') + '</select>' +
      '<select id="fsort" aria-label="Sort">' +
      '<option value="rank"' + (st.sort === 'rank' ? ' selected' : '') + '>Sort: rank</option>' +
      '<option value="implied"' + (st.sort === 'implied' ? ' selected' : '') + '>Sort: implied value</option>' +
      '<option value="tvl"' + (st.sort === 'tvl' ? ' selected' : '') + '>Sort: TVL</option>' +
      '<option value="growth"' + (st.sort === 'growth' ? ' selected' : '') + '>Sort: 7-day growth</option>' +
      '<option value="age"' + (st.sort === 'age' ? ' selected' : '') + '>Sort: age</option></select>' +
      '<label><input type="checkbox" id="fwatch"' + (st.watch ? ' checked' : '') + '> Watchlist only</label>' +
      '<span class="count">' + rows.length + ' of ' + D.board_size + ' rows</span></div>' +
      '<table><thead><tr><th class="num" data-s="rank">#</th><th data-s="rank">Protocol</th>' +
      '<th data-s="tvl">TVL</th><th data-s="growth" class="num">7d</th><th data-s="age" class="num">Age</th>' +
      '<th data-s="implied" class="num">Implied value</th></tr></thead><tbody>';
    slice.forEach(function (r) {
      var w = Math.max(2, Math.round(100 * r.implied_value_usd / maxImp));
      h += '<tr data-slug="' + esc(r.slug) + '"><td class="rank num' + (r.rank === 1 ? ' rank1' : '') + '">' + r.rank + '</td>' +
        '<td><span class="name">' + esc(r.name) + '</span><span class="sub">' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</span>' +
        (D.watchlist.indexOf(r.slug) >= 0 ? ' <span class="pill">WATCHLIST</span>' : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num ' + pctCls(r.change_7d) + '">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + ageFmt(r.age_days) + '</td>' +
        '<td class="num"><b>' + money(r.implied_value_usd) + '</b><span class="bar"><i style="width:' + w + '%"></i></span></td></tr>';
    });
    h += '</tbody></table><div class="pager">' +
      '<button id="prev" type="button"' + (page <= 1 ? ' disabled' : '') + '>← Previous</button>' +
      '<span>Page ' + page + ' of ' + pages + ' — showing ' + ((page - 1) * PAGE + 1) + '–' + Math.min(page * PAGE, rows.length) + ' of ' + rows.length + '</span>' +
      '<button id="next" type="button"' + (page >= pages ? ' disabled' : '') + '>Next →</button></div></section>';
    view.innerHTML = h;
    bindBoard(st, page, pages);
  }
  function bindBoard(st, page, pages) {
    var q = document.getElementById('fq');
    var cat = document.getElementById('fcat');
    var chain = document.getElementById('fchain');
    var sort = document.getElementById('fsort');
    var watch = document.getElementById('fwatch');
    function go() {
      st.q = q.value; st.cat = cat.value; st.chain = chain.value; st.sort = sort.value; st.watch = watch.checked; st.page = 1;
      setHash(st); render();
    }
    q.addEventListener('input', go);
    cat.addEventListener('change', go);
    chain.addEventListener('change', go);
    sort.addEventListener('change', go);
    watch.addEventListener('change', go);
    var prev = document.getElementById('prev');
    var next = document.getElementById('next');
    if (prev) prev.addEventListener('click', function () { st.page = Math.max(1, page - 1); setHash(st); render(); });
    if (next) next.addEventListener('click', function () { st.page = Math.min(pages, page + 1); setHash(st); render(); });
    view.querySelectorAll('tbody tr').forEach(function (tr) {
      tr.addEventListener('click', function () { location.hash = '#detail=' + encodeURIComponent(tr.getAttribute('data-slug')); });
    });
    view.querySelectorAll('thead th[data-s]').forEach(function (th) {
      th.addEventListener('click', function () {
        var s = th.getAttribute('data-s');
        st.sort = s === 'rank' ? 'rank' : s; st.page = 1; setHash(st); render();
      });
    });
  }

  /* ---------- detail ---------- */
  function findRow(slug) {
    for (var i = 0; i < D.rows.length; i++) if (D.rows[i].slug === slug) return { kind: 'board', row: D.rows[i] };
    for (var j = 0; j < D.live.length; j++) if (D.live[j].slug === slug) return { kind: 'live', row: D.live[j] };
    for (var k = 0; k < D.excluded.length; k++) if (D.excluded[k].slug === slug) return { kind: 'excluded', row: D.excluded[k] };
    return null;
  }
  function renderDetail(st) {
    var found = findRow(st.slug);
    if (!found) {
      view.innerHTML = '<section class="panel"><h2>Not on this radar</h2><p class="lede">No protocol with that slug is in the snapshot.</p><button class="back" type="button" data-back>← Back to the board</button></section>';
      bindBack();
      return;
    }
    var r = found.row;
    var h = '<section class="panel"><button class="back" type="button" data-back>← Back to the board</button>' +
      '<div class="detail-head"><h2>' + esc(r.name) + '</h2><span class="pill">' + esc(r.category || 'Uncategorised') + '</span></div>' +
      '<p class="lede">' + esc(r.chains.join(', ')) + ' · TVL ' + money(r.tvl_usd) + ' · listed ' + esc(r.listed_at || 'unknown') + '</p>';
    if (found.kind === 'excluded') {
      h += '<div class="note"><p><b>Set aside, not ranked.</b> ' + esc(r.reason) + '. It records no token, but its launch would be the token of something that already trades, so the board does not rank it as a launch of its own.</p></div>';
    } else if (found.kind === 'live') {
      h += '<p><span class="big">' + money(r.mcap_usd) + '<small>market cap — it already trades</small></span></p>' +
        '<table class="kv"><tr><td>Market cap / TVL multiple</td><td>' + num(r.multiple) + '×</td></tr>' +
        '<tr><td>TVL</td><td>' + moneyFull(r.tvl_usd) + '</td></tr>' +
        '<tr><td>7-day TVL change</td><td class="' + pctCls(r.change_7d) + '">' + pct(r.change_7d) + '</td></tr></table>' +
        '<p class="lede">This protocol already has a token that trades, so the board shows the market&rsquo;s own value for it and never an implied one. It is one of the live comparables the model learns its multiples from.</p>';
    } else {
      var base = r.tvl_usd * r.multiple;
      h += '<p><span class="big">' + money(r.implied_value_usd) + '<small>implied launch value · rank #' + r.rank + ' of ' + D.board_size + '</small></span></p>' +
        '<h3>How the value is built</h3><table class="kv">' +
        '<tr><td>TVL × category multiple (' + num(r.multiple) + '×)</td><td>' + moneyFull(base) + '</td></tr>' +
        '<tr><td>× growth (' + num(r.growth_multiplier) + '× · 7d ' + pct(r.change_7d) + ')</td><td>' + moneyFull(base * r.growth_multiplier) + '</td></tr>' +
        '<tr><td>× maturity (' + num(r.maturity_multiplier) + '× · ' + ageFmt(r.age_days) + ', no token)</td><td>' + moneyFull(base * r.growth_multiplier * r.maturity_multiplier) + '</td></tr>' +
        '<tr><td>× breadth (' + num(r.breadth_multiplier) + '× · ' + r.chains.length + ' chain' + (r.chains.length === 1 ? '' : 's') + ')</td><td>' + moneyFull(r.implied_value_usd) + '</td></tr></table>' +
        '<p class="lede">' + esc(r.multiple_source) + '. Market median multiple ' + num(D.global_multiple) + '×.</p>' +
        '<h3>Farm plan — six steps</h3><ol class="steps">' +
        r.farm_steps.map(function (s) {
          var m = s.match(/^(.*?) Cost: (.*?)\. Time: (.*?)\.?$/);
          var text = m ? m[1] : s, cost = m ? m[2] : '', time = m ? m[3] : '';
          return '<li><div>' + esc(text) + '<div class="cost">Cost: ' + esc(cost) + ' · Time: ' + esc(time) + '</div></div></li>';
        }).join('') + '</ol>';
      var comps = D.live.filter(function (l) { return l.category === r.category; }).slice(0, 5);
      if (comps.length) {
        h += '<h3>Live comparables in ' + esc(r.category || 'this category') + '</h3><table><thead><tr><th>Protocol</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">Multiple</th></tr></thead><tbody>' +
          comps.map(function (l) {
            return '<tr><td><span class="name">' + esc(l.name) + '</span></td><td class="num">' + money(l.tvl_usd) + '</td><td class="num">' + money(l.mcap_usd) + '</td><td class="num">' + num(l.multiple) + '×</td></tr>';
          }).join('') + '</tbody></table>';
      }
    }
    h += '</section>';
    view.innerHTML = h;
    bindBack();
  }
  function bindBack() {
    view.querySelectorAll('[data-back]').forEach(function (b) {
      b.addEventListener('click', function () { location.hash = '#'; });
    });
  }

  /* ---------- live / set aside / method ---------- */
  function renderLive() {
    var h = '<section class="panel"><h2>Live tokens — the market&rsquo;s own values</h2>' +
      '<p class="lede">The ' + D.live_size + ' largest protocols whose token already trades, by market cap. The board never ' +
      'ranks these by implied value: their multiple is the market&rsquo;s verdict, and it is what the model learns from. ' +
      'Click a row for its detail.</p><table><thead><tr><th>#</th><th>Protocol</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">Multiple</th></tr></thead><tbody>';
    D.live.forEach(function (l, i) {
      h += '<tr data-slug="' + esc(l.slug) + '"><td class="rank num">' + (i + 1) + '</td><td><span class="name">' + esc(l.name) + '</span><span class="sub">' + esc(l.category || 'Uncategorised') + '</span></td>' +
        '<td class="num">' + money(l.tvl_usd) + '</td><td class="num">' + money(l.mcap_usd) + '</td><td class="num">' + num(l.multiple) + '×</td></tr>';
    });
    h += '</tbody></table></section>';
    view.innerHTML = h;
    view.querySelectorAll('tbody tr').forEach(function (tr) {
      tr.addEventListener('click', function () { location.hash = '#detail=' + encodeURIComponent(tr.getAttribute('data-slug')); });
    });
  }
  function renderSetAside(st) {
    var pages = Math.max(1, Math.ceil(D.excluded.length / PAGE));
    var page = Math.min(st.page, pages);
    var slice = D.excluded.slice((page - 1) * PAGE, page * PAGE);
    var h = '<section class="panel"><h2>Set aside — ' + D.excluded_size + ' protocols</h2>' +
      '<p class="lede">These record no token, but the board does not rank them: each is a wrapped, staked or bridged ' +
      'product of a token that already trades, a versioned pool, or an exchange&rsquo;s product. Listing them here, ' +
      'with the reason, is the separation the board&rsquo;s ranking rests on.</p><table><thead><tr><th>Protocol</th><th class="num">TVL</th><th>Why it is set aside</th></tr></thead><tbody>';
    slice.forEach(function (x) {
      h += '<tr data-slug="' + esc(x.slug) + '"><td><span class="name">' + esc(x.name) + '</span><span class="sub">' + esc(x.category || 'Uncategorised') + '</span></td>' +
        '<td class="num">' + money(x.tvl_usd) + '</td><td>' + esc(x.reason) + '</td></tr>';
    });
    h += '</tbody></table><div class="pager"><button id="prev" type="button"' + (page <= 1 ? ' disabled' : '') + '>← Previous</button>' +
      '<span>Page ' + page + ' of ' + pages + '</span>' +
      '<button id="next" type="button"' + (page >= pages ? ' disabled' : '') + '>Next →</button></div></section>';
    view.innerHTML = h;
    var prev = document.getElementById('prev');
    var next = document.getElementById('next');
    if (prev) prev.addEventListener('click', function () { st.page = Math.max(1, page - 1); setHash(st); render(); });
    if (next) next.addEventListener('click', function () { st.page = Math.min(pages, page + 1); setHash(st); render(); });
    view.querySelectorAll('tbody tr').forEach(function (tr) {
      tr.addEventListener('click', function () { location.hash = '#detail=' + encodeURIComponent(tr.getAttribute('data-slug')); });
    });
  }
  function renderMethod() {
    var m = D.model;
    var h = '<section class="panel"><h2>Method — model ' + esc(D.model_version) + '</h2>' +
      '<p class="lede">Everything below is computed from the sealed snapshot at run time. No protocol name is ' +
      'special-cased; the same function scores every row.</p>' +
      '<div class="formula">implied = TVL × multiple × growth × maturity × breadth\n' +
      'multiple  = category median mcap/TVL, shrunk toward the market median\n' +
      '            weight n/(n+' + m.shrink_k + '), clamped to [' + m.mult_floor + '×, ' + m.mult_cap + '×] of market median\n' +
      'growth    = 1 + clamp(7d change, ' + m.growth_floor + '%, +' + m.growth_cap + '%) × ' + m.growth_weight + '\n' +
      'maturity  = ' + m.maturity_floor + ' + ' + m.maturity_range + ' × min(age, ' + m.maturity_days + 'd) / ' + m.maturity_days + 'd\n' +
      'breadth   = 1 + ' + m.breadth_per_chain + ' × min(chains − 1, ' + m.breadth_max_chains + ')</div>' +
      '<h3>Category multiples (market median ' + num(D.global_multiple) + '×)</h3>' +
      '<table><thead><tr><th>Category</th><th class="num">Live tokens</th><th class="num">Category median</th><th class="num">Weight</th><th class="num">Multiple used</th></tr></thead><tbody>' +
      D.multiples.map(function (x) {
        return '<tr><td>' + esc(x.category) + '</td><td class="num">' + x.live_n + '</td><td class="num">' + (x.category_median == null ? '—' : num(x.category_median) + '×') + '</td><td class="num">' + num(x.weight) + '</td><td class="num"><b>' + num(x.multiple) + '×</b></td></tr>';
      }).join('') + '</tbody></table>' +
      '<h3>What the board ranks, and what it sets aside</h3>' +
      '<p class="lede">A row ranks when its record carries no token (no market cap, no CoinGecko id, no symbol) ' +
      'and no rule sets it aside: its category is not Bridge, Canonical Bridge, Liquid Staking, Liquid Restaking, ' +
      'Restaked BTC or CEX; its name ends in no version marker; it carries no whole word wrapped, staked or staking; ' +
      'and it does not begin with an exchange&rsquo;s name. That is the house&rsquo;s own watchlist rule, applied to ' +
      'every row alike — so WBTC, Binance staked ETH and USDT0 sit in Set aside, not at the top of the board.</p>' +
      '<h3>What the snapshot cannot say</h3>' +
      '<p class="lede">The snapshot carries no revenue, no fees, no user counts and no points program, so the model uses ' +
      'only TVL, seven-day growth, age with no token, and chain breadth. A protocol&rsquo;s implied value is a claim ' +
      'about what its token would be worth if its record stayed as it is — not a prediction that it issues one, or ' +
      'when, or at what price. Farm plans are generic by category: they name the action, the capital and the time, ' +
      'never a guaranteed airdrop.</p>' +
      '<p class="lede mono">Snapshot: ' + esc(D.source) + ' · as of ' + esc(D.as_of) + ' · floor ' + moneyFull(D.floor_usd) + '</p></section>';
    view.innerHTML = h;
  }

  /* ---------- router ---------- */
  function render() {
    var st = hashState();
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('on', t.getAttribute('data-view') === (st.view === 'detail' ? 'board' : st.view));
    });
    if (st.view === 'detail') renderDetail(st);
    else if (st.view === 'live') renderLive();
    else if (st.view === 'setaside') renderSetAside(st);
    else if (st.view === 'method') renderMethod();
    else renderBoard(st);
  }
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      var v = t.getAttribute('data-view');
      location.hash = v === 'board' ? '#' : '#view=' + v;
    });
  });
  window.addEventListener('hashchange', render);
  renderStats();
  render();
})();
