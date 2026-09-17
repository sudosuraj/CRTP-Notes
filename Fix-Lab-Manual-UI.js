(function() {
    // Remove previous toggle if it exists
    const oldBtn = document.getElementById('sidebar-toggle');
    if (oldBtn) oldBtn.remove();
    const oldStyle = document.getElementById('sidebar-toggle-style');
    if (oldStyle) oldStyle.remove();

    // Inject styles for the button and hidden state
    const style = document.createElement('style');
    style.id = 'sidebar-toggle-style';
    style.innerHTML = `
        #sidebar-toggle {
            position: fixed;
            top: 12px;
            left: 12px;
            z-index: 999999;
            background: #0969da;
            color: #ffffff;
            border: none;
            border-radius: 4px;
            padding: 4px 6px;
            font-size: 11px;
            line-height: 1;
            cursor: pointer;
            box-shadow: 0 1px 4px rgba(0,0,0,0.15);
            transition: background 0.15s ease;
        }
        #sidebar-toggle:hover {
            background: #0860ca;
        }

        /* ---- HIDE THE SIDEBAR ---- */
        body.bh-sidebar-hidden nav,
        body.bh-sidebar-hidden .sidebar {
            display: none !important;
        }

        /* ---- COLLAPSE THE SPACE IT LEFT BEHIND ---- */
        body.bh-sidebar-hidden .content,
        body.bh-sidebar-hidden .markdown-body {
            margin-left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding-left: 20px !important;
            padding-right: 20px !important;
            box-sizing: border-box !important;
        }

        /* ---- KILL BOTTOM HORIZONTAL SCROLLBAR ---- */
        html, body {
            overflow-x: hidden !important;
            max-width: 100vw !important;
        }
        pre, .markdown-body pre {
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: auto !important;
        }
    `;
    document.head.appendChild(style);

    // Create the toggle button
    const btn = document.createElement('button');
    btn.id = 'sidebar-toggle';
    btn.textContent = '☰';

    btn.addEventListener('click', () => {
        document.body.classList.toggle('bh-sidebar-hidden');
    });

    document.body.appendChild(btn);
    console.log('Sidebar toggle added.');
})();
