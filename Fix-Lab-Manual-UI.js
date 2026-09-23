(function() {
    // ==========================================================
    // CLEANUP — remove anything from previous runs
    // ==========================================================
    ['sidebar-toggle', 'dark-toggle', 'bh-toggle-style', 'bh-sticky-style',
     'bh-cmdk-style', 'bh-cmdk-overlay', 'bh-progress-bar', 'bh-cmdk-hint',
     'bh-cmdk-status'].forEach(id => document.getElementById(id)?.remove());
    document.querySelectorAll('.bh-sticky-heading').forEach(h => {
        h.classList.remove('bh-sticky-heading');
        h.style.transform = '';
    });
    if (window.__bhStickyCleanup) {
        try { window.__bhStickyCleanup(); } catch(e) {}
        window.__bhStickyCleanup = null;
    }

    // ==========================================================
    // STYLES
    // ==========================================================
    const style = document.createElement('style');
    style.id = 'bh-toggle-style';
    style.innerHTML = `
        /* ---------- Toggle buttons ---------- */
        #sidebar-toggle, #dark-toggle {
            position: fixed;
            top: 10px;
            z-index: 999999;
            background: rgba(9, 105, 218, 0.35);
            color: rgba(255, 255, 255, 0.85);
            border: none;
            padding: 6px 9px;
            font-size: 13px;
            line-height: 1;
            cursor: pointer;
            box-shadow: 0 1px 4px rgba(0,0,0,0.10);
            opacity: 0.6;
            transition: opacity 0.15s ease, background 0.15s ease;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
        }
        #sidebar-toggle { left: 0;  border-radius: 0 6px 6px 0; }
        #dark-toggle    { right: 0; border-radius: 6px 0 0 6px; }
        #sidebar-toggle:hover, #dark-toggle:hover {
            opacity: 1;
            background: #0860ca;
            color: #ffffff;
        }

        /* ---------- Sidebar hide + reflow ---------- */
        body.bh-sidebar-hidden nav,
        body.bh-sidebar-hidden .sidebar { display: none !important; }
        body.bh-sidebar-hidden .content,
        body.bh-sidebar-hidden .markdown-body {
            margin-left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
        }

        /* ---------- Layout fixes (sticky + no horizontal scroll) ---------- */
        html, body {
            overflow-x: clip !important;
            overflow-y: visible !important;
            max-width: 100vw !important;
        }
        .layout { display: block !important; }
        pre, .markdown-body pre {
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: auto !important;
        }

        /* ---------- Sticky headings ---------- */
        .bh-sticky-heading {
            position: sticky !important;
            top: 0 !important;
            z-index: 900 !important;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: transform 0.12s linear;
            will-change: transform;
        }
        body:not(.bh-dark) .bh-sticky-heading {
            background-color: rgba(255, 255, 255, 0.94) !important;
        }
        body.bh-dark .bh-sticky-heading {
            background-color: rgba(13, 17, 23, 0.94) !important;
            border-bottom-color: #30363d !important;
        }

        /* ---------- Reading progress bar ---------- */
        #bh-progress-bar {
            position: fixed; top: 0; left: 0;
            height: 3px; width: 0%;
            background: linear-gradient(90deg, #0969da, #58a6ff);
            z-index: 2147483647;
            transition: width 0.06s linear;
            pointer-events: none;
        }
        body.bh-dark #bh-progress-bar {
            background: linear-gradient(90deg, #1f6feb, #79c0ff);
        }

        /* ---------- Command palette ---------- */
        #bh-cmdk-overlay {
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.4);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            z-index: 2147483646;
            display: none;
            align-items: flex-start;
            justify-content: center;
            padding-top: 8vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #bh-cmdk-overlay.bh-open { display: flex; }

        #bh-cmdk {
            width: min(760px, 94vw);
            background: #ffffff;
            border: 1px solid #d1d9e0;
            border-radius: 10px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
            overflow: hidden;
            display: flex; flex-direction: column;
            max-height: 80vh;
        }
        body.bh-dark #bh-cmdk { background: #161b22; border-color: #30363d; }

        #bh-cmdk-input {
            width: 100%; box-sizing: border-box;
            padding: 16px 18px; font-size: 16px;
            border: none; outline: none;
            background: transparent; color: #1f2328;
            border-bottom: 1px solid #d1d9e0;
            font-family: inherit;
        }
        body.bh-dark #bh-cmdk-input {
            color: #e6edf3; border-bottom-color: #30363d;
        }
        #bh-cmdk-input::placeholder { color: #8b949e; }

        #bh-cmdk-status {
            padding: 8px 18px; font-size: 11px;
            color: #8b949e; border-bottom: 1px solid #d1d9e0;
            background: #f6f8fa;
        }
        body.bh-dark #bh-cmdk-status {
            background: #0d1117; border-bottom-color: #30363d;
        }

        #bh-cmdk-results { overflow-y: auto; max-height: 65vh; }

        .bh-cmdk-item {
            padding: 10px 18px;
            cursor: pointer;
            display: flex; flex-direction: column; gap: 4px;
            color: #1f2328; font-size: 13px;
            border-left: 3px solid transparent;
            border-bottom: 1px solid #f0f3f6;
        }
        body.bh-dark .bh-cmdk-item {
            color: #e6edf3;
            border-bottom-color: #21262d;
        }

        .bh-cmdk-item.bh-active,
        .bh-cmdk-item:hover {
            background: rgba(9,105,218,0.08);
            border-left-color: #0969da;
        }
        body.bh-dark .bh-cmdk-item.bh-active,
        body.bh-dark .bh-cmdk-item:hover {
            background: rgba(88,166,255,0.1);
            border-left-color: #58a6ff;
        }

        .bh-cmdk-loc {
            font-size: 11px; font-weight: 600;
            color: #0969da;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        body.bh-dark .bh-cmdk-loc { color: #58a6ff; }

        .bh-cmdk-snippet {
            font-size: 13px;
            line-height: 1.5;
            color: #59636e;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        body.bh-dark .bh-cmdk-snippet { color: #8b949e; }

        .bh-cmdk-snippet mark {
            background: #fff3a3;
            color: #1f2328;
            padding: 0 2px;
            border-radius: 2px;
        }
        body.bh-dark .bh-cmdk-snippet mark {
            background: #bb8009;
            color: #ffffff;
        }

        .bh-cmdk-empty {
            padding: 30px 16px; text-align: center;
            color: #8b949e; font-size: 13px;
        }

        #bh-cmdk-hint {
            position: fixed; bottom: 12px; right: 12px;
            z-index: 999997;
            background: rgba(9,105,218,0.35);
            color: rgba(255,255,255,0.9);
            padding: 5px 9px; border-radius: 4px;
            font-size: 11px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            opacity: 0.5; cursor: pointer;
            transition: opacity 0.15s, background 0.15s;
            box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }
        #bh-cmdk-hint:hover { opacity: 1; background: #0860ca; }

        /* ---------- Dark mode palette ---------- */
        body.bh-dark { background: #0d1117 !important; color: #c9d1d9 !important; }
        body.bh-dark .content,
        body.bh-dark .markdown-body {
            background: #0d1117 !important;
            color: #c9d1d9 !important;
        }
        body.bh-dark h1, body.bh-dark h2 {
            color: #f0f6fc !important;
            border-bottom-color: #21262d !important;
        }
        body.bh-dark h3, body.bh-dark h4,
        body.bh-dark h5, body.bh-dark h6 { color: #f0f6fc !important; }
        body.bh-dark p, body.bh-dark li,
        body.bh-dark td, body.bh-dark dt, body.bh-dark dd {
            color: #c9d1d9 !important;
        }
        body.bh-dark small, body.bh-dark .muted, body.bh-dark em {
            color: #8b949e !important;
        }
        body.bh-dark strong, body.bh-dark b { color: #f0f6fc !important; }
        body.bh-dark a { color: #58a6ff !important; }
        body.bh-dark a:hover { color: #79c0ff !important; }
        body.bh-dark a:visited { color: #a371f7 !important; }
        body.bh-dark hr { border-color: #21262d !important; }
        body.bh-dark blockquote {
            border-left-color: #30363d !important;
            background: #161b22 !important;
            color: #8b949e !important;
        }
        body.bh-dark table { border-color: #30363d !important; }
        body.bh-dark th {
            background: #161b22 !important;
            color: #f0f6fc !important;
            border-color: #30363d !important;
        }
        body.bh-dark td {
            border-color: #30363d !important;
            color: #c9d1d9 !important;
        }
        body.bh-dark tr:nth-child(even) td { background: #0f141a !important; }
        body.bh-dark code:not(pre code) {
            background: rgba(110,118,129,0.25) !important;
            color: #ff7b72 !important;
        }
        body.bh-dark pre {
            background: #161b22 !important;
            color: #c9d1d9 !important;
            border: 1px solid #30363d !important;
        }
        body.bh-dark nav,
        body.bh-dark .sidebar {
            background: #010409 !important;
            color: #c9d1d9 !important;
            border-right: 1px solid #21262d !important;
        }
        body.bh-dark nav a, body.bh-dark .sidebar a,
        body.bh-dark nav li, body.bh-dark .sidebar li {
            color: #c9d1d9 !important;
        }
        body.bh-dark nav a:hover, body.bh-dark .sidebar a:hover {
            color: #58a6ff !important;
        }
        body.bh-dark img { filter: brightness(0.92); }
        body.bh-dark ::selection {
            background: #1f6feb !important;
            color: #ffffff !important;
        }

        /* ---------- Responsive ---------- */
        .content, .markdown-body {
            box-sizing: border-box !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
        }
        @media (max-width: 640px) {
            #sidebar-toggle, #dark-toggle { padding: 8px 11px; font-size: 15px; top: 8px; }
            .content, .markdown-body { padding-left: 12px !important; padding-right: 12px !important; }
            .bh-sticky-heading { padding-top: 8px !important; padding-bottom: 8px !important; }
            pre, .markdown-body pre { font-size: 12px !important; padding: 12px !important; }
        }
        @media (min-width: 641px) and (max-width: 1024px) {
            .content, .markdown-body { padding-left: 24px !important; padding-right: 24px !important; }
            #sidebar-toggle, #dark-toggle { padding: 7px 10px; font-size: 14px; }
        }
        @media (min-width: 1025px) {
            .content, .markdown-body { padding-left: 32px !important; padding-right: 32px !important; }
        }
        @media (hover: none) {
            #sidebar-toggle, #dark-toggle { opacity: 0.85; }
        }
    `;
    document.head.appendChild(style);

    // ==========================================================
    // PERSISTENCE
    // ==========================================================
    const STORAGE_KEY = 'bh-prefs-v6';
    const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; } };
    const save = (p) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {} };
    const prefs = load();

    if (prefs.sidebarHidden) document.body.classList.add('bh-sidebar-hidden');
    if (prefs.dark)          document.body.classList.add('bh-dark');

    // ==========================================================
    // SIDEBAR TOGGLE (left edge)
    // ==========================================================
    const sideBtn = document.createElement('button');
    sideBtn.id = 'sidebar-toggle';
    sideBtn.textContent = '☰';
    sideBtn.title = 'Toggle sidebar';
    sideBtn.addEventListener('click', () => {
        prefs.sidebarHidden = document.body.classList.toggle('bh-sidebar-hidden');
        save(prefs);
    });
    document.body.appendChild(sideBtn);

    // ==========================================================
    // DARK MODE TOGGLE (right edge)
    // ==========================================================
    const darkBtn = document.createElement('button');
    darkBtn.id = 'dark-toggle';
    darkBtn.textContent = prefs.dark ? '☀' : '🌙';
    darkBtn.title = 'Toggle dark mode';
    darkBtn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('bh-dark');
        darkBtn.textContent = isDark ? '☀' : '🌙';
        prefs.dark = isDark;
        save(prefs);
    });
    document.body.appendChild(darkBtn);

    // ==========================================================
    // READING PROGRESS BAR
    // ==========================================================
    const bar = document.createElement('div');
    bar.id = 'bh-progress-bar';
    document.body.appendChild(bar);

    function updateProgress() {
        const h = document.documentElement;
        const scrolled = h.scrollTop || document.body.scrollTop || window.pageYOffset;
        const total = (h.scrollHeight || document.body.scrollHeight) - h.clientHeight;
        bar.style.width = (total > 0 ? (scrolled / total) * 100 : 0) + '%';
    }
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();

    // ==========================================================
    // STICKY HEADINGS (with push-up effect — no overlap)
    // ==========================================================
    const scope = document.querySelector('.markdown-body')
               || document.querySelector('.content')
               || document.body;
    const headings = Array.from(scope.querySelectorAll('h2, h3'));
    headings.forEach(h => h.classList.add('bh-sticky-heading'));

    let raf = null;
    function updateSticky() {
        raf = null;
        for (let i = 0; i < headings.length; i++) {
            const current = headings[i];
            const next = headings[i + 1];
            const curRect = current.getBoundingClientRect();

            if (curRect.top > 0) {
                if (current.style.transform) current.style.transform = '';
                continue;
            }
            if (!next) { current.style.transform = ''; continue; }

            const nextRect = next.getBoundingClientRect();
            const curHeight = curRect.height;
            if (nextRect.top < curHeight) {
                const overlap = curHeight - Math.max(nextRect.top, 0);
                current.style.transform = 'translateY(-' + overlap + 'px)';
            } else {
                current.style.transform = '';
            }
        }
    }
    function onScroll() {
        if (raf) return;
        raf = requestAnimationFrame(updateSticky);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateSticky();

    window.__bhStickyCleanup = () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
    };

    // ==========================================================
    // FULL-TEXT SEARCH INDEX
    // ==========================================================
    const blocks = [];
    let currentHeading = '';
    const walker = document.createTreeWalker(
        scope,
        NodeFilter.SHOW_ELEMENT,
        {
            acceptNode: (el) => {
                const tag = el.tagName;
                if (/^(H1|H2|H3|H4)$/.test(tag)) return NodeFilter.FILTER_ACCEPT;
                if (/^(P|LI|PRE|TD|DD|BLOCKQUOTE)$/.test(tag)) return NodeFilter.FILTER_ACCEPT;
                return NodeFilter.FILTER_SKIP;
            }
        }
    );

    let node;
    while ((node = walker.nextNode())) {
        const tag = node.tagName;
        if (/^(H1|H2|H3|H4)$/.test(tag)) {
            currentHeading = node.textContent.trim();
            const t = currentHeading;
            if (t && t.length > 1) {
                if (!node.id) node.id = 'bh-b-' + blocks.length;
                blocks.push({ el: node, text: t, lower: t.toLowerCase(), heading: currentHeading });
            }
            continue;
        }
        if (node.closest('pre') && tag !== 'PRE') continue;
        if (node.closest('li') && tag !== 'LI') continue;
        const t = node.textContent.trim();
        if (!t || t.length < 3) continue;
        if (!node.id) node.id = 'bh-b-' + blocks.length;
        blocks.push({ el: node, text: t, lower: t.toLowerCase(), heading: currentHeading });
    }
    console.log('Indexed ' + blocks.length + ' text blocks for search.');

    // ==========================================================
    // COMMAND PALETTE
    // ==========================================================
    const overlay = document.createElement('div');
    overlay.id = 'bh-cmdk-overlay';
    overlay.innerHTML = `
        <div id="bh-cmdk" role="dialog" aria-label="Search page">
            <input id="bh-cmdk-input" type="text"
                   placeholder="Search page text…  ↑↓ navigate · Enter jump · Esc close"
                   autocomplete="off" spellcheck="false">
            <div id="bh-cmdk-status">Type at least 2 characters…</div>
            <div id="bh-cmdk-results"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#bh-cmdk-input');
    const status = overlay.querySelector('#bh-cmdk-status');
    const results = overlay.querySelector('#bh-cmdk-results');

    let activeIndex = 0;
    let currentMatches = [];

    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
    function escapeRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    function makeSnippet(text, term) {
        const lower = text.toLowerCase();
        const idx = lower.indexOf(term.toLowerCase());
        if (idx === -1) return escapeHtml(text.slice(0, 200));
        const start = Math.max(0, idx - 60);
        const end = Math.min(text.length, idx + term.length + 100);
        let s = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
        s = escapeHtml(s);
        const re = new RegExp('(' + escapeRegex(term) + ')', 'gi');
        return s.replace(re, '<mark>$1</mark>');
    }

    function renderResults(query) {
        const q = query.trim().toLowerCase();
        results.innerHTML = '';

        if (q.length < 2) {
            status.textContent = 'Type at least 2 characters…';
            currentMatches = [];
            return;
        }
        currentMatches = blocks.filter(b => b.lower.includes(q)).slice(0, 100);
        status.textContent = currentMatches.length === 0
            ? 'No matches for "' + query + '"'
            : currentMatches.length + ' match' + (currentMatches.length === 1 ? '' : 'es');

        if (currentMatches.length === 0) {
            results.innerHTML = '<div class="bh-cmdk-empty">No matches found.</div>';
            return;
        }
        activeIndex = 0;
        currentMatches.forEach((m, idx) => {
            const row = document.createElement('div');
            row.className = 'bh-cmdk-item' + (idx === 0 ? ' bh-active' : '');
            row.dataset.index = idx;

            const loc = document.createElement('div');
            loc.className = 'bh-cmdk-loc';
            loc.textContent = '§ ' + (m.heading || '(top of page)');
            row.appendChild(loc);

            const snip = document.createElement('div');
            snip.className = 'bh-cmdk-snippet';
            snip.innerHTML = makeSnippet(m.text, query.trim());
            row.appendChild(snip);

            results.appendChild(row);
        });
    }

    function setActive(idx) {
        const rows = results.querySelectorAll('.bh-cmdk-item');
        if (!rows.length) return;
        activeIndex = Math.max(0, Math.min(idx, rows.length - 1));
        rows.forEach((r, i) => r.classList.toggle('bh-active', i === activeIndex));
        rows[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    function jumpTo(item) {
        if (!item) return;
        closePalette();
        const el = item.el;
        const y = el.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: y, behavior: 'smooth' });

        const prevBg = el.style.backgroundColor;
        const prevTrans = el.style.transition;
        el.style.transition = 'background-color 0.4s';
        el.style.backgroundColor = 'rgba(255, 235, 59, 0.4)';
        setTimeout(() => {
            el.style.backgroundColor = prevBg;
            el.style.transition = prevTrans;
        }, 900);
    }

    function openPalette() {
        overlay.classList.add('bh-open');
        input.value = '';
        renderResults('');
        setTimeout(() => input.focus(), 30);
    }
    function closePalette() { overlay.classList.remove('bh-open'); }

    let inputTimer = null;
    input.addEventListener('input', () => {
        clearTimeout(inputTimer);
        inputTimer = setTimeout(() => renderResults(input.value), 80);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIndex + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIndex - 1); }
        else if (e.key === 'Enter') {
            e.preventDefault();
            const picked = currentMatches[activeIndex];
            if (picked) jumpTo(picked);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closePalette();
        }
    });

    results.addEventListener('mousedown', (e) => {
        const row = e.target.closest('.bh-cmdk-item');
        if (!row) return;
        e.preventDefault();
        const idx = parseInt(row.dataset.index, 10);
        const picked = currentMatches[idx];
        if (picked) jumpTo(picked);
    });

    overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) closePalette();
    });

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            e.stopPropagation();
            overlay.classList.contains('bh-open') ? closePalette() : openPalette();
        }
    }, true);

    const hint = document.createElement('div');
    hint.id = 'bh-cmdk-hint';
    hint.textContent = 'Ctrl+K · Search';
    hint.title = 'Open full-text search';
    hint.addEventListener('click', openPalette);
    document.body.appendChild(hint);

    console.log('✅ All features loaded: sidebar · dark mode · sticky headers · progress bar · search.');
})();
