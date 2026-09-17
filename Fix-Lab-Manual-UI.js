(function() {
    const oldBtn = document.getElementById('sidebar-toggle');
    if (oldBtn) oldBtn.remove();
    const oldStyle = document.getElementById('sidebar-toggle-style');
    if (oldStyle) oldStyle.remove();
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
            border-radius: 6px;
            padding: 8px 14px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            transition: background 0.15s ease, left 0.2s ease;
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
        const hidden = document.body.classList.toggle('bh-sidebar-hidden');
        btn.textContent = hidden ? '☰' : '☰';
        btn.style.left = hidden ? '12px' : '12px';
    });

    document.body.appendChild(btn);
    console.log('Sidebar toggle added. Click the button in the top-left.');
})();
