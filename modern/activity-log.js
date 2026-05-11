(function () {
    const storageKey = 'sustainTrack_action_trail_v1';
    const maxEntries = 40;
    const trailList = document.getElementById('activity-log');
    const noTrailMessage = document.getElementById('no-activity-message');
    const clearTrailButton = document.getElementById('clear-activity-log');
    const copyTrailButton = document.getElementById('copy-activity-log');
    const form = document.getElementById('product-form');
    const saveButton = document.getElementById('save-result');
    const jsonExportButton = document.getElementById('export-json');
    const csvExportButton = document.getElementById('export-csv');
    const importInput = document.getElementById('import-file');
    const dashboardFilter = document.getElementById('dashboard-filter');
    const targetReduction = document.getElementById('target-reduction');

    if (!trailList || !noTrailMessage || !clearTrailButton || !copyTrailButton) {
        return;
    }

    let actionTrail = loadTrail();

    function loadTrail() {
        try {
            const raw = localStorage.getItem(storageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed.slice(0, maxEntries) : [];
        } catch (error) {
            return [];
        }
    }

    function saveTrail() {
        localStorage.setItem(storageKey, JSON.stringify(actionTrail));
    }

    function makeEntry(action, detail) {
        const now = new Date();
        return {
            id: `trail-${now.getTime()}-${Math.floor(Math.random() * 10000)}`,
            action,
            detail,
            at: now.toISOString()
        };
    }

    function summarizeEvent(action, detail) {
        const text = [action, detail].filter(Boolean).join(': ');
        const item = document.createElement('li');
        item.className = 'activity-item';

        const time = document.createElement('time');
        time.dateTime = nowForRow(item.dataset?.at || '');
        time.textContent = nowForRow(item.dataset?.at || '');

        const summary = document.createElement('div');
        summary.className = 'activity-summary';
        summary.textContent = text;

        item.append(time, summary);
        return item;
    }

    function nowForRow(value) {
        if (!value) return 'Unknown';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return value;
        return parsed.toLocaleString();
    }

    function renderTrail() {
        const hasItems = actionTrail.length > 0;
        noTrailMessage.classList.toggle('hidden', hasItems);

        while (trailList.firstChild) {
            trailList.removeChild(trailList.firstChild);
        }

        actionTrail.forEach((entry) => {
            const item = document.createElement('li');
            item.className = 'activity-item';

            const timestamp = document.createElement('time');
            const safeDate = new Date(entry.at);
            timestamp.dateTime = entry.at;
            timestamp.textContent = Number.isNaN(safeDate.getTime()) ? entry.at : safeDate.toLocaleString();

            const summary = document.createElement('p');
            summary.className = 'activity-summary';
            summary.textContent = `${entry.action}${entry.detail ? `: ${entry.detail}` : ''}`;

            item.append(timestamp, summary);
            trailList.appendChild(item);
        });
    }

    function recordAction(action, detail = '') {
        actionTrail.unshift(makeEntry(action, detail));
        actionTrail = actionTrail.slice(0, maxEntries);
        saveTrail();
        renderTrail();
    }

    function safeText(value, fallback = '') {
        return typeof value === 'string' ? value.trim() : fallback;
    }

    if (form) {
        form.addEventListener('submit', () => {
            const productName = safeText(document.getElementById('product-name')?.value, 'Unsaved product');
            window.setTimeout(() => {
                const resultName = safeText(document.getElementById('result-product-name')?.textContent, productName);
                recordAction('Calculated footprint', resultName);
            }, 5);
        });
    }

    if (saveButton) {
        saveButton.addEventListener('click', () => {
            const resultName = safeText(document.getElementById('result-product-name')?.textContent, 'Last product');
            recordAction('Saved product', resultName);
        });
    }

    if (jsonExportButton) {
        jsonExportButton.addEventListener('click', () => {
            recordAction('Exported JSON report', 'manual download');
        });
    }

    if (csvExportButton) {
        csvExportButton.addEventListener('click', () => {
            recordAction('Exported CSV report', 'manual download');
        });
    }

    if (importInput) {
        importInput.addEventListener('change', () => {
            const file = importInput.files ? importInput.files[0] : null;
            if (!file) return;
            recordAction('Imported dataset', `${file.name} (${Math.round(file.size / 1024)} KB)`);
        });
    }

    if (dashboardFilter) {
        dashboardFilter.addEventListener('change', () => {
            recordAction('Adjusted dashboard filter', safeText(dashboardFilter.value, 'default'));
        });
    }

    if (targetReduction) {
        targetReduction.addEventListener('change', () => {
            recordAction('Updated reduction target', `${targetReduction.value}%`);
        });
    }

    clearTrailButton.addEventListener('click', () => {
        actionTrail = [];
        saveTrail();
        renderTrail();
    });

    copyTrailButton.addEventListener('click', async () => {
        const rows = actionTrail.map((entry) => {
            const parsed = new Date(entry.at);
            const when = Number.isNaN(parsed.getTime()) ? entry.at : parsed.toLocaleString();
            return `${when}\t${entry.action}${entry.detail ? `: ${entry.detail}` : ''}`;
        });

        const payload = rows.length > 0
            ? rows.join('\n')
            : 'No actions recorded yet.';

        if (navigator?.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(payload);
                copyTrailButton.textContent = 'Copied';
                window.setTimeout(() => {
                    copyTrailButton.textContent = 'Copy Trail';
                }, 1400);
                return;
            } catch (error) {
                // fallthrough to text area fallback below
            }
        }

        const area = document.createElement('textarea');
        area.value = payload;
        area.setAttribute('aria-hidden', 'true');
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
        copyTrailButton.textContent = 'Copied';
        window.setTimeout(() => {
            copyTrailButton.textContent = 'Copy Trail';
        }, 1400);
    });

    if (window.SustainTrackActionTrailBootstrapped) {
        return;
    }
    window.SustainTrackActionTrailBootstrapped = true;

    renderTrail();
})();