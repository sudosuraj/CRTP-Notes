(function() {
    // ---- Cleanup ----
    ['sidebar-toggle', 'dark-toggle', 'bh-toggle-style'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });

    const style = document.createElement('style');
    style.id = 'bh-toggle-style';
    style.innerHTML = `
        /* ---- Buttons ---- */
        #sidebar-toggle, #dark-toggle {
            position: fixed;
            top: 12px;
            z-index: 999999;
            background: rgba(9, 105, 218, 0.35);
            color: rgba(255, 255, 255, 0.85);
            border: none;
            border-radius: 4px;
            padding: 4px 6px;
            font-size: 11px;
            line-height: 1;
            cursor: pointer;
            box-shadow: 0 1px 4px rgba(0,0,0,0.10);
            opacity: 0.55;
            transition: opacity 0.15s ease, background 0.15s ease;
        }
        #sidebar-toggle { left: 12px; }
        #dark-toggle    { left: 46px; }
        #sidebar-toggle:hover, #dark-toggle:hover {
            opacity: 1;
            background: #0860ca;
            color: #ffffff;
        }

        /* ---- Sidebar hide + reflow ---- */
        body.bh-sidebar-hidden nav,
        body.bh-sidebar-hidden .sidebar { display: none !important; }
        body.bh-sidebar-hidden .content,
        body.bh-sidebar-hidden .markdown-body {
            margin-left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding-left: 20px !important;
            padding-right: 20px !important;
            box-sizing: border-box !important;
        }

        /* ---- No horizontal page scroll ---- */
        html, body { overflow-x: hidden !important; max-width: 100vw !important; }
        pre, .markdown-body pre {
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: auto !important;
        }

        /* ==========================================================
           DARK MODE — role-based palette
           Backgrounds: neutral dark
           Text: layered whites/greys
           Links: bright blue (original hue)
           Code blocks: GitHub dark terminal green/cyan
           Inline code: subtle grey pill
           Warnings/success: keep hue
           ========================================================== */

        body.bh-dark {
            background: #0d1117 !important;
            color: #c9d1d9 !important;
        }

        /* Main content surfaces */
        body.bh-dark .content,
        body.bh-dark .markdown-body {
            background: #0d1117 !important;
            color: #c9d1d9 !important;
        }

        /* Headings — brighter white, subtle divider */
        body.bh-dark h1, body.bh-dark h2 {
            color: #f0f6fc !important;
            border-bottom: 1px solid #21262d !important;
        }
        body.bh-dark h3, body.bh-dark h4,
        body.bh-dark h5, body.bh-dark h6 {
            color: #f0f6fc !important;
        }

        /* Body text */
        body.bh-dark p,
        body.bh-dark li,
        body.bh-dark td,
        body.bh-dark dt,
        body.bh-dark dd {
            color: #c9d1d9 !important;
        }

        /* Muted/secondary text */
        body.bh-dark small,
        body.bh-dark .muted,
        body.bh-dark em {
            color: #8b949e !important;
        }

        /* Strong / bold — brighter */
        body.bh-dark strong, body.bh-dark b {
            color: #f0f6fc !important;
        }

        /* Links — keep blue hue, brighter for dark bg */
        body.bh-dark a { color: #58a6ff !important; }
        body.bh-dark a:hover { color: #79c0ff !important; }
        body.bh-dark a:visited { color: #a371f7 !important; }

        /* Horizontal rules */
        body.bh-dark hr { border-color: #21262d !important; }

        /* Blockquotes */
        body.bh-dark blockquote {
            border-left: 4px solid #30363d !important;
            background: #161b22 !important;
            color: #8b949e !important;
        }

        /* Tables */
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
        body.bh-dark tr:nth-child(even) td {
            background: #0f141a !important;
        }

        /* Inline code — subtle grey pill */
        body.bh-dark code:not(pre code) {
            background: rgba(110,118,129,0.25) !important;
            color: #ff7b72 !important;   /* GitHub's pink for inline code */
            padding: 0.15em 0.4em !important;
            border-radius: 4px !important;
        }

        /* Pre / terminal blocks — GitHub dark theme */
        body.bh-dark pre {
            background: #161b22 !important;
            color: #c9d1d9 !important;
            border: 1px solid #30363d !important;
            border-radius: 6px !important;
        }
        body.bh-dark pre code {
            background: transparent !important;
            color: #c9d1d9 !important;
        }

        /* Preserve syntax-highlighting colors inside pre blocks */
        body.bh-dark pre .token.string,
        body.bh-dark pre .token.attr-value { color: #a5d6ff !important; }
        body.bh-dark pre .token.keyword,
        body.bh-dark pre .token.boolean { color: #ff7b72 !important; }
        body.bh-dark pre .token.function,
        body.bh-dark pre .token.class-name { color: #d2a8ff !important; }
        body.bh-dark pre .token.number,
        body.bh-dark pre .token.constant { color: #79c0ff !important; }
        body.bh-dark pre .token.comment { color: #8b949e !important; font-style: italic !important; }
        body.bh-dark pre .token.operator,
        body.bh-dark pre .token.punctuation { color: #c9d1d9 !important; }

        /* Semantic callouts — keep their hue, just darken the surface */
        body.bh-dark .warning,
        body.bh-dark .alert-warning,
        body.bh-dark [class*="warning"] {
            background: rgba(187,128,9,0.15) !important;
            color: #e3b341 !important;
            border-left-color: #d29922 !important;
        }
        body.bh-dark .error,
        body.bh-dark .alert-danger,
        body.bh-dark [class*="error"],
        body.bh-dark [class*="danger"] {
            background: rgba(248,81,73,0.15) !important;
            color: #ff7b72 !important;
            border-left-color: #f85149 !important;
        }
        body.bh-dark .success,
        body.bh-dark .alert-success,
        body.bh-dark [class*="success"] {
            background: rgba(63,185,80,0.15) !important;
            color: #56d364 !important;
            border-left-color: #3fb950 !important;
        }
        body.bh-dark .info,
        body.bh-dark .alert-info,
        body.bh-dark [class*="info"] {
            background: rgba(56,139,253,0.15) !important;
            color: #79c0ff !important;
            border-left-color: #1f6feb !important;
        }

        /* Sidebar / nav — even darker than main bg */
        body.bh-dark nav,
        body.bh-dark .sidebar {
            background: #010409 !important;
            border-right: 1px solid #21262d !important;
            color: #c9d1d9 !important;
        }
        body.bh-dark nav a,
        body.bh-dark .sidebar a,
        body.bh-dark nav li,
        body.bh-dark .sidebar li {
            color: #c9d1d9 !important;
        }
        body.bh-dark nav a:hover,
        body.bh-dark .sidebar a:hover {
            color: #58a6ff !important;
        }
        body.bh-dark nav .active,
        body.bh-dark .sidebar .active {
            color: #f0f6fc !important;
            background: #161b22 !important;
        }

        /* Form elements */
        body.bh-dark input,
        body.bh-dark textarea,
        body.bh-dark select {
            background: #0d1117 !important;
            color: #c9d1d9 !important;
            border: 1px solid #30363d !important;
        }
        body.bh-dark input::placeholder,
        body.bh-dark textarea::placeholder {
            color: #6e7681 !important;
        }

        /* Images — slightly dimmed so pure white images aren't blinding */
        body.bh-dark img { filter: brightness(0.92); }

        /* Selection */
        body.bh-dark ::selection {
            background: #1f6feb !important;
            color: #ffffff !important;
        }
    `;
    document.head.appendChild(style);

    // ---- State helpers ----
    const STORAGE_KEY = 'bh-prefs-v3';
    function loadPrefs() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
        catch { return {}; }
    }
    function savePrefs(p) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
    }
    const prefs = loadPrefs();

    if (prefs.sidebarHidden) document.body.classList.add('bh-sidebar-hidden');
    if (prefs.dark)          document.body.classList.add('bh-dark');

    // ---- Sidebar toggle ----
    const sideBtn = document.createElement('button');
    sideBtn.id = 'sidebar-toggle';
    sideBtn.textContent = '☰';
    sideBtn.title = 'Toggle sidebar';
    sideBtn.addEventListener('click', () => {
        const hidden = document.body.classList.toggle('bh-sidebar-hidden');
        prefs.sidebarHidden = hidden;
        savePrefs(prefs);
    });
    document.body.appendChild(sideBtn);

    // ---- Dark mode toggle ----
    const darkBtn = document.createElement('button');
    darkBtn.id = 'dark-toggle';
    darkBtn.textContent = prefs.dark ? '☀' : '🌙';
    darkBtn.title = 'Toggle dark mode';
    darkBtn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('bh-dark');
        darkBtn.textContent = isDark ? '☀' : '🌙';
        prefs.dark = isDark;
        savePrefs(prefs);
    });
    document.body.appendChild(darkBtn);

    console.log('Intelligent dark mode applied.');
})();
