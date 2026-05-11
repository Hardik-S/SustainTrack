document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('product-form');
    const materialsContainer = document.getElementById('materials-container');
    const addMaterialButton = document.getElementById('add-material');
    const resultProductName = document.getElementById('result-product-name');
    const quickKpiContainer = document.getElementById('quick-kpis');
    const totalCarbonValue = document.getElementById('total-carbon-value');
    const carbonRating = document.getElementById('carbon-rating');
    const impactScore = document.getElementById('impact-score');
    const resultPanel = document.getElementById('result-panel');
    const saveResultButton = document.getElementById('save-result');
    const exportJsonButton = document.getElementById('export-json');
    const exportCsvButton = document.getElementById('export-csv');
    const importFileInput = document.getElementById('import-file');
    const reductionSummary = document.getElementById('reduction-summary');
    const targetReductionInput = document.getElementById('target-reduction');
    const targetOutput = document.getElementById('target-output');
    const reductionSteps = document.getElementById('reduction-steps');
    const dashboardFilter = document.getElementById('dashboard-filter');
    const savedProductsList = document.getElementById('saved-products-list');
    const noProductsMessage = document.getElementById('no-products-message');
    const materialRecommendations = document.getElementById('material-recommendations');
    const energyRecommendations = document.getElementById('energy-recommendations');
    const transportRecommendations = document.getElementById('transport-recommendations');
    const lifecycleRecommendations = document.getElementById('lifecycle-recommendations');

    const materialEmissionFactors = { aluminum: 11.0, steel: 2.8, plastic: 3.5, paper: 1.8, glass: 0.9, wood: 0.7, cotton: 5.5, other: 2.5 };
    const transportEmissionFactors = { truck: 0.1, rail: 0.03, ship: 0.015, air: 0.6 };
    const energyEmissionFactors = { grid: 0.4, renewable: 0.05, mixed: 0.25 };
    const modernStorageKey = 'sustainTrack_modern_products_v2';
    const legacyStorageKey = 'sustainTrack_products';
    const materialTemplates = ['aluminum', 'steel', 'plastic', 'paper', 'glass', 'wood', 'cotton', 'other'];

    let materialRowCount = 0;
    let currentProduct = null;
    let savedProducts = [];
    let charts = {};
    let targetReductionPercent = Number(targetReductionInput.value);

    addInitialMaterialRow();
    populateRecommendations();
    restoreSavedProducts();
    renderDashboard();
    renderQuickKpis();
    initializeCharts();

    addMaterialButton.addEventListener('click', addMaterialRow);
    productForm.addEventListener('submit', handleCalculate);
    saveResultButton.addEventListener('click', saveCurrentProduct);
    exportJsonButton.addEventListener('click', exportCurrentJson);
    exportCsvButton.addEventListener('click', exportCsv);
    importFileInput.addEventListener('change', handleImportFile);
    dashboardFilter.addEventListener('change', renderDashboard);
    targetReductionInput.addEventListener('input', onTargetChange);

    function createElement(type, className = '', text = '') {
        const element = document.createElement(type);
        if (className) element.className = className;
        if (text) element.textContent = text;
        return element;
    }

    function normalizeKey(value) {
        return (value || '').trim().toLowerCase();
    }

    function toKg(value) {
        const num = Number.parseFloat(value);
        return Number.isFinite(num) ? num : 0;
    }

    function addInitialMaterialRow() {
        materialRowCount = 0;
        materialsContainer.innerHTML = '';
        addMaterialRow();
    }

    function addMaterialRow() {
        materialRowCount += 1;
        const row = createElement('div', 'material-row');
        const rowIndex = materialRowCount;
        row.innerHTML = `
            <label>
                <span>Material Type</span>
                <select class="material-type">
                    ${materialTemplates.map((type) => `<option value="${type}">${type}</option>`).join('')}
                </select>
            </label>
            <label>
                <span>Material Weight (kg)</span>
                <input class="material-weight" type="number" min="0" step="0.01" required>
            </label>
            <label>
                <span>Sourcing Distance (km)</span>
                <input class="material-source" type="number" min="0" required>
            </label>
            <button class="button secondary" type="button" aria-label="Remove material row">Remove</button>
        `;
        const removeButton = row.querySelector('button');
        removeButton.addEventListener('click', () => {
            if (materialsContainer.children.length === 1) return;
            row.remove();
        });
        materialsContainer.appendChild(row);
    }

    function collectMaterialRows() {
        const rows = materialsContainer.querySelectorAll('.material-row');
        return [...rows].map((row) => {
            const materialType = row.querySelector('.material-type')?.value || 'other';
            const materialWeight = toKg(row.querySelector('.material-weight')?.value);
            const materialSource = toKg(row.querySelector('.material-source')?.value);
            return { materialType, materialWeight, materialSource };
        }).filter((row) => row.materialWeight > 0 || row.materialSource > 0);
    }

    function handleCalculate(event) {
        event.preventDefault();

        const productName = document.getElementById('product-name').value.trim();
        const energyConsumption = toKg(document.getElementById('energy-consumption').value);
        const energySource = document.getElementById('energy-source').value;
        const transportMethod = document.getElementById('transport-method').value;
        const transportDistance = toKg(document.getElementById('transport-distance').value);
        const productLifespan = Math.max(0.1, toKg(document.getElementById('product-lifespan').value));
        const recyclability = Math.max(0, Math.min(100, toKg(document.getElementById('recyclability').value)));
        const rows = collectMaterialRows();

        if (!productName || rows.length === 0) return;

        let materialsFootprint = 0;
        let totalWeight = 0;
        const materialBreakdown = [];

        rows.forEach((row) => {
            const base = materialEmissionFactors[row.materialType] || materialEmissionFactors.other;
            const materialEmission = base * row.materialWeight;
            const sourcingEmission = (transportEmissionFactors.truck * row.materialSource * row.materialWeight) / 1000;
            const totalMaterialEmission = materialEmission + sourcingEmission;
            materialsFootprint += totalMaterialEmission;
            totalWeight += row.materialWeight;

            materialBreakdown.push({
                type: row.materialType,
                weight: row.materialWeight,
                emission: totalMaterialEmission
            });
        });

        const manufacturingFootprint = energyConsumption * (energyEmissionFactors[energySource] || energyEmissionFactors.grid);
        const distributionFootprint = (transportEmissionFactors[transportMethod] * transportDistance * Math.max(totalWeight, 0)) / 1000;
        const recyclingFactor = (100 - recyclability) / 100;
        const lifespanFactor = 1 / productLifespan;
        const useEolFootprint = totalWeight * recyclingFactor * lifespanFactor * 2;
        const totalFootprint = materialsFootprint + manufacturingFootprint + distributionFootprint + useEolFootprint;

        currentProduct = {
            id: `product-${Date.now()}`,
            name: productName,
            date: new Date().toISOString(),
            footprint: {
                total: totalFootprint,
                materials: materialsFootprint,
                manufacturing: manufacturingFootprint,
                distribution: distributionFootprint,
                useEol: useEolFootprint
            },
            details: {
                materialBreakdown,
                energyConsumption,
                energySource,
                transportMethod,
                transportDistance,
                productLifespan,
                recyclability,
                totalWeight
            }
        };

        displayResult();
    }

    function carbonRatingFrom(total) {
        if (total < 10) return { label: 'A+ (Excellent)', color: '#13ba94' };
        if (total < 25) return { label: 'A (Very Good)', color: '#2bdaac' };
        if (total < 50) return { label: 'B (Good)', color: '#5ab8ff' };
        if (total < 100) return { label: 'C (Average)', color: '#f6cd61' };
        if (total < 200) return { label: 'D (Needs Work)', color: '#ffab4d' };
        return { label: 'E (High Impact)', color: '#ff6178' };
    }

    function impactBand(total) {
        if (total <= 10) return 'Excellent';
        if (total <= 25) return 'Strong';
        if (total <= 50) return 'Good';
        if (total <= 100) return 'Watch';
        if (total <= 200) return 'Improve';
        return 'Critical';
    }

    function emissionScore(total) {
        if (total <= 10) return 95;
        if (total <= 25) return 86;
        if (total <= 50) return 72;
        if (total <= 100) return 58;
        if (total <= 200) return 40;
        return 18;
    }

    function displayResult() {
        resultPanel.classList.remove('hidden');
        resultProductName.textContent = currentProduct.name;
        totalCarbonValue.textContent = `${currentProduct.footprint.total.toFixed(2)} kg CO₂e`;
        carbonRating.textContent = carbonRatingFrom(currentProduct.footprint.total).label;
        carbonRating.style.color = carbonRatingFrom(currentProduct.footprint.total).color;
        impactScore.textContent = `${emissionScore(currentProduct.footprint.total)}/100`;

        renderTargetSummary();
        updateDashboard();
        updateCharts();
        document.getElementById('result-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function buildReductionPlan(product, targetPercent) {
        if (!product || targetPercent <= 0) return [];

        const requiredReduction = (product.footprint.total * targetPercent) / 100;
        const savingsBuckets = [
            {
                label: 'Materials',
                availableKg: product.footprint.materials * 0.55,
                action: 'Use recycled content, right-size designs, and trim transport distance for sourcing.'
            },
            {
                label: 'Manufacturing',
                availableKg: product.footprint.manufacturing * 0.7,
                action: 'Shift process power to renewable energy and reduce cycle waste.'
            },
            {
                label: 'Distribution',
                availableKg: product.footprint.distribution * 0.5,
                action: 'Use rail/ship for long haul and redesign packaging to reduce tonne-km.'
            },
            {
                label: 'Use & End-of-Life',
                availableKg: product.footprint.useEol * 0.45,
                action: 'Improve lifespan and design for higher recycling rates.'
            }
        ];

        let remaining = requiredReduction;
        const plan = [];
        savingsBuckets.forEach((bucket) => {
            const saved = Math.min(bucket.availableKg, remaining);
            remaining -= saved;
            if (saved > 0) {
                plan.push({ ...bucket, saved });
            }
        });

        return {
            requiredReduction,
            remainder: remaining,
            plan
        };
    }

    function renderTargetSummary() {
        targetOutput.textContent = `${targetReductionPercent}%`;
        if (!currentProduct) return;

        const plan = buildReductionPlan(currentProduct, targetReductionPercent);
        reductionSummary.textContent = `Target: ${targetReductionPercent}% reduction for ${currentProduct.name}.`;
        reductionSteps.innerHTML = '';

        const header = createElement('li', 'reduction-header');
        header.textContent = `Need to reduce ${plan.requiredReduction.toFixed(2)} kg CO₂e`;
        reductionSteps.appendChild(header);

        if (plan.plan.length === 0) {
            const message = createElement('li');
            message.textContent = 'Run calculator to generate a reduction plan.';
            reductionSteps.appendChild(message);
            return;
        }

        plan.plan.forEach((bucket) => {
            const row = createElement('li');
            row.innerHTML = `<strong>${bucket.label}</strong>: save ${bucket.saved.toFixed(2)} kg CO₂e via ${bucket.action}`;
            reductionSteps.appendChild(row);
        });

        if (plan.remainder > 0) {
            const remainingItem = createElement('li');
            remainingItem.textContent = `Remaining gap ${plan.remainder.toFixed(2)} kg CO₂e; add one more design iteration for highest-priority impact reductions.`;
            reductionSteps.appendChild(remainingItem);
        }
    }

    function onTargetChange() {
        targetReductionPercent = Number(targetReductionInput.value);
        renderTargetSummary();
    }

    function saveCurrentProduct() {
        if (!currentProduct) return;

        const normalizedName = normalizeKey(currentProduct.name);
        const index = savedProducts.findIndex((product) => normalizeKey(product.name) === normalizedName);
        if (index >= 0) {
            savedProducts[index] = currentProduct;
        } else {
            savedProducts = [...savedProducts, currentProduct];
        }
        persistSavedProducts();
        renderDashboard();
        renderQuickKpis();
    }

    function exportCurrentJson() {
        if (!currentProduct) return;
        triggerDownload('sustaintrack-modern-product.json', JSON.stringify(currentProduct, null, 2), 'application/json');
    }

    function exportCsv() {
        if (savedProducts.length === 0) return;
        const rows = [
            ['name', 'date', 'total_kg_co2e', 'materials', 'manufacturing', 'distribution', 'use_and_eol', 'total_weight_kg', 'recyclability_percent']
        ];
        savedProducts.forEach((product) => {
            rows.push([
                product.name,
                product.date,
                product.footprint.total.toFixed(2),
                product.footprint.materials.toFixed(2),
                product.footprint.manufacturing.toFixed(2),
                product.footprint.distribution.toFixed(2),
                product.footprint.useEol.toFixed(2),
                product.details.totalWeight.toFixed(2),
                product.details.recyclability.toFixed(2)
            ]);
        });
        triggerDownload('sustaintrack-modern-products.csv', rows.map((row) => row.join(',')).join('\n'), 'text/csv');
    }

    function triggerDownload(filename, content, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        URL.revokeObjectURL(url);
        anchor.remove();
    }

    function parseCsvToProducts(content) {
        const lines = content.trim().split(/\r?\n/);
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map((item) => item.trim().toLowerCase());
        return lines.slice(1).map((line) => line.split(',').map((value) => value.trim())).filter((values) => values.length > 1).map((values) => {
            const row = {};
            headers.forEach((header, idx) => {
                row[header] = values[idx];
            });
            return {
                id: `product-${Date.now()}-${Math.round(Math.random() * 9999)}`,
                name: row.name || 'Imported Product',
                date: row.date || new Date().toISOString(),
                footprint: {
                    total: Number.parseFloat(row.total_kg_co2e || 0),
                    materials: Number.parseFloat(row.materials || 0),
                    manufacturing: Number.parseFloat(row.manufacturing || 0),
                    distribution: Number.parseFloat(row.distribution || 0),
                    useEol: Number.parseFloat(row.use_and_eol || 0)
                },
                details: {
                    materialBreakdown: [],
                    energyConsumption: 0,
                    energySource: '',
                    transportMethod: '',
                    transportDistance: 0,
                    productLifespan: 1,
                    recyclability: Number.parseFloat(row.recyclability_percent || 0),
                    totalWeight: Number.parseFloat(row.total_weight_kg || 0)
                }
            };
        });
    }

    function handleImportFile(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            let parsed = [];
            if (file.name.toLowerCase().endsWith('.csv') || /^text\/csv/i.test(file.type)) {
                parsed = parseCsvToProducts(String(reader.result || ''));
            } else {
                try {
                    const raw = JSON.parse(String(reader.result || '{}'));
                    parsed = normalizeImportedProducts(raw);
                } catch (error) {
                    alert('Invalid import format. Use CSV or JSON.');
                    return;
                }
            }
            if (!Array.isArray(parsed) || parsed.length === 0) {
                alert('No valid products found in imported file.');
                return;
            }
            savedProducts = mergeProducts([...savedProducts, ...parsed]);
            persistSavedProducts();
            renderDashboard();
            renderQuickKpis();
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    function normalizeImportedProducts(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object');
        if (value && Array.isArray(value.products)) return value.products.filter((item) => item && typeof item === 'object');
        return [];
    }

    function mergeProducts(incomingProducts) {
        const map = new Map();
        const output = [];
        incomingProducts.forEach((product) => {
            const key = `${normalizeKey(product.name)}-${new Date(product.date).toISOString()}`;
            if (!map.has(key)) {
                map.set(key, true);
                output.push(product);
            }
        });
        return output;
    }

    function restoreSavedProducts() {
        const modernProducts = loadProducts(modernStorageKey);
        const legacyProducts = loadProducts(legacyStorageKey);
        const normalizedLegacy = normalizeLegacyProducts(legacyProducts);
        savedProducts = mergeProducts([...(normalizedLegacy || []), ...(modernProducts || [])]);
        savedProducts = savedProducts
            .filter((product) => product?.footprint && Number.isFinite(product.footprint.total))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        persistSavedProducts();
        renderQuickKpis();
    }

    function normalizeLegacyProducts(items) {
        if (!Array.isArray(items)) return [];
        return items.map((product) => ({
            id: product.id || `legacy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: product.name || 'Legacy Product',
            date: product.date || new Date().toISOString(),
            footprint: {
                total: Number.parseFloat(product.footprint?.total || 0),
                materials: Number.parseFloat(product.footprint?.materials || 0),
                manufacturing: Number.parseFloat(product.footprint?.manufacturing || 0),
                distribution: Number.parseFloat(product.footprint?.distribution || 0),
                useEol: Number.parseFloat(product.footprint?.useEol || 0)
            },
            details: {
                materialBreakdown: Array.isArray(product.details?.materialBreakdown) ? product.details.materialBreakdown : [],
                energyConsumption: Number.parseFloat(product.details?.energyConsumption || 0),
                energySource: product.details?.energySource || '',
                transportMethod: product.details?.transportMethod || '',
                transportDistance: Number.parseFloat(product.details?.transportDistance || 0),
                productLifespan: Number.parseFloat(product.details?.productLifespan || 1),
                recyclability: Number.parseFloat(product.details?.recyclability || 0),
                totalWeight: Number.parseFloat(product.details?.totalWeight || 0)
            }
        }));
    }

    function loadProducts(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function persistSavedProducts() {
        localStorage.setItem(modernStorageKey, JSON.stringify(savedProducts));
        localStorage.setItem('sustainTrack_last_active_modern_products', JSON.stringify(savedProducts.map((product) => product.id)));
    }

    function renderQuickKpis() {
        const totalProducts = savedProducts.length;
        const avgFootprint = savedProducts.length === 0 ? 0 : savedProducts.reduce((sum, item) => sum + item.footprint.total, 0) / savedProducts.length;
        const bestImpact = savedProducts.reduce((best, product) => {
            if (!best || product.footprint.total < best.footprint.total) return product;
            return best;
        }, null);

        quickKpiContainer.innerHTML = `
            <div class="panel">
                <p>Saved products</p>
                <strong>${totalProducts}</strong>
            </div>
            <div class="panel">
                <p>Average footprint</p>
                <strong>${avgFootprint.toFixed(1)} kg CO₂e</strong>
            </div>
            <div class="panel">
                <p>Best performer</p>
                <strong>${bestImpact ? bestImpact.name : '—'}</strong>
            </div>
        `;
    }

    function renderDashboard() {
        savedProductsList.innerHTML = '';
        noProductsMessage.classList.toggle('hidden', savedProducts.length > 0);
        if (savedProducts.length === 0) return;

        const sorted = getSortedSavedProducts();
        sorted.forEach((product) => {
            const item = createElement('button', 'product-item');
            item.innerHTML = `<span>${product.name}</span><span>${product.footprint.total.toFixed(2)} kg CO₂e</span>`;
            item.addEventListener('click', () => {
                currentProduct = product;
                displayResult();
            });
            savedProductsList.appendChild(item);
        });

        updateCharts();
    }

    function getSortedSavedProducts() {
        const items = [...savedProducts];
        switch (dashboardFilter.value) {
            case 'recent':
                return items.sort((a, b) => new Date(b.date) - new Date(a.date));
            case 'highest':
                return items.sort((a, b) => b.footprint.total - a.footprint.total);
            case 'lowest':
                return items.sort((a, b) => a.footprint.total - b.footprint.total);
            default:
                return items;
        }
    }

    function initializeCharts() {
        if (typeof Chart === 'undefined') return;
        const commonOptions = { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: 'rgba(234, 241, 255, 0.86)' } } } };
        charts.breakdown = new Chart(document.getElementById('breakdown-chart'), {
            type: 'doughnut',
            data: emptyChartData(),
            options: commonOptions
        });
        charts.comparison = new Chart(document.getElementById('comparison-chart'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{ label: 'kg CO₂e', data: [], backgroundColor: '#5ab8ff' }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
        charts.category = new Chart(document.getElementById('category-chart'), {
            type: 'pie',
            data: emptyChartData(),
            options: commonOptions
        });
        charts.trend = new Chart(document.getElementById('trend-chart'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Avg kg CO₂e', data: [], borderColor: '#36d6ae', tension: .35 }] },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }

    function emptyChartData() {
        return {
            labels: ['Materials', 'Manufacturing', 'Distribution', 'Use & End-of-Life'],
            datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#5ab8ff', '#13ba94', '#8fd3ff', '#ffd16a'] }]
        };
    }

    function destroyAndResetCharts() {
        if (!charts.breakdown) return;
        charts.breakdown.data.datasets[0].data = [0, 0, 0, 0];
        charts.comparison.data.labels = [];
        charts.comparison.data.datasets[0].data = [];
        charts.category.data.datasets[0].data = [0, 0, 0, 0];
        charts.trend.data.labels = [];
        charts.trend.data.datasets[0].data = [];
        updateCharts();
    }

    function updateCharts() {
        if (!charts.breakdown) return;
        if (!Array.isArray(savedProducts) || savedProducts.length === 0) {
            destroyAndResetCharts();
            return;
        }

        if (currentProduct) {
            charts.breakdown.data.datasets[0].data = [
                currentProduct.footprint.materials,
                currentProduct.footprint.manufacturing,
                currentProduct.footprint.distribution,
                currentProduct.footprint.useEol
            ];
            charts.breakdown.update();
        }

        const allNames = savedProducts.map((product) => product.name);
        const allTotals = savedProducts.map((product) => product.footprint.total);
        const totals = ['materials', 'manufacturing', 'distribution', 'useEol'].map((key) => savedProducts.reduce((sum, product) => sum + (product.footprint[key] || 0), 0));

        charts.comparison.data.labels = allNames;
        charts.comparison.data.datasets[0].data = allTotals;
        charts.comparison.update();

        charts.category.data.datasets[0].data = totals;
        charts.category.update();

        const monthGroups = {};
        savedProducts.forEach((product) => {
            const date = new Date(product.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthGroups[monthKey]) monthGroups[monthKey] = { total: 0, count: 0 };
            monthGroups[monthKey].total += product.footprint.total;
            monthGroups[monthKey].count += 1;
        });

        const trendLabels = [];
        const trendData = [];
        Object.keys(monthGroups).sort().forEach((monthKey) => {
            const month = monthGroups[monthKey];
            trendLabels.push(monthKey);
            trendData.push((month.total / month.count).toFixed(2));
        });

        charts.trend.data.labels = trendLabels;
        charts.trend.data.datasets[0].data = trendData;
        charts.trend.update();
    }

    function populateRecommendations() {
        materialRecommendations.innerHTML = `
            <li>Shift to recycled or lower-impact materials in the top three high-impact components.</li>
            <li>Design for lower mass where structural integrity allows.</li>
            <li>Source raw materials from regional suppliers to reduce primary transport emissions.</li>
        `;
        energyRecommendations.innerHTML = `
            <li>Move production to sites with high renewable mix or direct power-purchase agreements.</li>
            <li>Introduce heat recovery and cycle-level energy reuse targets.</li>
            <li>Run manufacturing energy audits quarterly with actionable closure actions.</li>
        `;
        transportRecommendations.innerHTML = `
            <li>Optimize palletization and carton utilization to reduce empty space.</li>
            <li>Prefer mixed-mode logistics, reserving air for urgent exceptions only.</li>
            <li>Move part of finished goods distribution closer to demand clusters.</li>
        `;
        lifecycleRecommendations.innerHTML = `
            <li>Set warranty and service policies that reward repaired and long-lived products.</li>
            <li>Increase material mono-composition to improve recycling rates.</li>
            <li>Publish simple customer end-of-life instructions and take-back path.</li>
        `;
    }
});
