document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const productForm = document.getElementById('product-form');
    const materialsContainer = document.getElementById('materials-container');
    const addMaterialButton = document.getElementById('add-material');
    const resultsSection = document.getElementById('results');
    const resultProductName = document.getElementById('result-product-name');
    const totalCarbonValue = document.getElementById('total-carbon-value');
    const carbonRating = document.getElementById('carbon-rating');
    const saveResultButton = document.getElementById('save-result');
    const exportPdfButton = document.getElementById('export-pdf');
    const dashboardFilter = document.getElementById('dashboard-filter');
    const savedProductsList = document.getElementById('saved-products-list');
    const noProductsMessage = document.getElementById('no-products-message');
    
    // Recommendation Lists
    const materialRecommendations = document.getElementById('material-recommendations');
    const energyRecommendations = document.getElementById('energy-recommendations');
    const transportRecommendations = document.getElementById('transport-recommendations');
    const lifecycleRecommendations = document.getElementById('lifecycle-recommendations');
    
    // Charts
    let breakdownChart, comparisonChart, categoryChart, trendChart;
    
    // Application State
    let materialRowCount = 1;
    let savedProducts = loadSavedProducts();
    let currentProduct = null;
    
    // Material Emission Factors (kg CO2e per kg of material)
    const materialEmissionFactors = {
        aluminum: 11.0,
        steel: 2.8,
        plastic: 3.5,
        paper: 1.8,
        glass: 0.9,
        wood: 0.7,
        cotton: 5.5,
        other: 2.5
    };
    
    // Transport Emission Factors (kg CO2e per tonne-km)
    const transportEmissionFactors = {
        truck: 0.1,
        rail: 0.03,
        ship: 0.015,
        air: 0.6
    };
    
    // Energy Emission Factors (kg CO2e per kWh)
    const energyEmissionFactors = {
        grid: 0.4,
        renewable: 0.05,
        mixed: 0.25
    };
    
    // Initialize the application
    initializeApp();
    
    // Add event listeners
    addMaterialButton.addEventListener('click', addMaterialRow);
    productForm.addEventListener('submit', calculateFootprint);
    saveResultButton.addEventListener('click', saveProduct);
    exportPdfButton.addEventListener('click', exportReport);
    dashboardFilter.addEventListener('change', updateDashboard);
    
    // Initialize the application
    function initializeApp() {
        updateDashboard();
        populateRecommendations();
        initializeCharts();
    }
    
    // Add a new material row to the form
    function addMaterialRow() {
        materialRowCount++;
        
        const materialRow = document.createElement('div');
        materialRow.className = 'material-row';
        materialRow.innerHTML = `
            <div class="form-group">
                <label for="material-type-${materialRowCount}">Material Type</label>
                <select id="material-type-${materialRowCount}" class="material-type">
                    <option value="aluminum">Aluminum</option>
                    <option value="steel">Steel</option>
                    <option value="plastic">Plastic</option>
                    <option value="paper">Paper/Cardboard</option>
                    <option value="glass">Glass</option>
                    <option value="wood">Wood</option>
                    <option value="cotton">Cotton</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label for="material-weight-${materialRowCount}">Weight (kg)</label>
                <input type="number" id="material-weight-${materialRowCount}" class="material-weight" min="0" step="0.01" required>
            </div>
            <div class="form-group">
                <label for="material-source-${materialRowCount}">Sourcing Distance (km)</label>
                <input type="number" id="material-source-${materialRowCount}" class="material-source" min="0" required>
            </div>
        `;
        
        materialsContainer.appendChild(materialRow);
    }
    
    // Calculate the carbon footprint of the product
    function calculateFootprint(e) {
        e.preventDefault();
        
        // Get product details from form
        const productName = document.getElementById('product-name').value;
        const energyConsumption = parseFloat(document.getElementById('energy-consumption').value);
        const energySource = document.getElementById('energy-source').value;
        const transportMethod = document.getElementById('transport-method').value;
        const transportDistance = parseFloat(document.getElementById('transport-distance').value);
        const productLifespan = parseFloat(document.getElementById('product-lifespan').value);
        const recyclability = parseFloat(document.getElementById('recyclability').value);
        
        // Calculate materials footprint
        let materialsFootprint = 0;
        let totalWeight = 0;
        const materialBreakdown = [];
        
        for (let i = 1; i <= materialRowCount; i++) {
            const materialType = document.getElementById(`material-type-${i}`).value;
            const materialWeight = parseFloat(document.getElementById(`material-weight-${i}`).value);
            const materialSource = parseFloat(document.getElementById(`material-source-${i}`).value);
            
            // Calculation: material emission factor × weight + transport emission for sourcing
            const materialEmission = materialEmissionFactors[materialType] * materialWeight;
            const sourcingEmission = (transportEmissionFactors.truck * materialSource * materialWeight) / 1000;
            const totalMaterialEmission = materialEmission + sourcingEmission;
            
            materialsFootprint += totalMaterialEmission;
            totalWeight += materialWeight;
            
            materialBreakdown.push({
                type: materialType,
                weight: materialWeight,
                emission: totalMaterialEmission
            });
        }
        
        // Calculate manufacturing footprint
        const manufacturingFootprint = energyConsumption * energyEmissionFactors[energySource];
        
        // Calculate distribution footprint
        const distributionFootprint = (transportEmissionFactors[transportMethod] * transportDistance * totalWeight) / 1000;
        
        // Calculate use & end-of-life footprint
        // Simplified calculation: lower recyclability and shorter lifespan increase footprint
        const recyclingFactor = (100 - recyclability) / 100;
        const lifespanFactor = 1 / productLifespan;
        const useEolFootprint = totalWeight * recyclingFactor * lifespanFactor * 2;
        
        // Calculate total footprint
        const totalFootprint = materialsFootprint + manufacturingFootprint + distributionFootprint + useEolFootprint;
        
        // Create current product object
        currentProduct = {
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
        
        // Display results
        displayResults();
    }
    
    // Display the carbon footprint results
    function displayResults() {
        // Show results section
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        // Update result summary
        resultProductName.textContent = currentProduct.name;
        totalCarbonValue.textContent = currentProduct.footprint.total.toFixed(2);
        
        // Set carbon rating
        let ratingText = '';
        let ratingColor = '';
        
        if (currentProduct.footprint.total < 10) {
            ratingText = 'A+ (Excellent)';
            ratingColor = '#27ae60';
        } else if (currentProduct.footprint.total < 25) {
            ratingText = 'A (Very Good)';
            ratingColor = '#2ecc71';
        } else if (currentProduct.footprint.total < 50) {
            ratingText = 'B (Good)';
            ratingColor = '#3498db';
        } else if (currentProduct.footprint.total < 100) {
            ratingText = 'C (Average)';
            ratingColor = '#f39c12';
        } else if (currentProduct.footprint.total < 200) {
            ratingText = 'D (Below Average)';
            ratingColor = '#e67e22';
        } else {
            ratingText = 'E (Poor)';
            ratingColor = '#e74c3c';
        }
        
        carbonRating.textContent = ratingText;
        carbonRating.style.color = ratingColor;
        
        // Update breakdown chart
        updateBreakdownChart();
    }
    
    // Update the breakdown chart
    function updateBreakdownChart() {
        if (breakdownChart) {
            breakdownChart.destroy();
        }
        
        const ctx = document.getElementById('breakdown-chart').getContext('2d');
        breakdownChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Materials', 'Manufacturing', 'Distribution', 'Use & End-of-Life'],
                datasets: [{
                    data: [
                        currentProduct.footprint.materials,
                        currentProduct.footprint.manufacturing,
                        currentProduct.footprint.distribution,
                        currentProduct.footprint.useEol
                    ],
                    backgroundColor: [
                        '#3498db',
                        '#2ecc71',
                        '#9b59b6',
                        '#f39c12'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw.toFixed(2);
                                const percentage = (context.raw / currentProduct.footprint.total * 100).toFixed(1);
                                return `${context.label}: ${value} kg CO₂e (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Save the current product
    function saveProduct() {
        if (!currentProduct) return;
        
        // Check if product with same name already exists
        const existingIndex = savedProducts.findIndex(p => p.name === currentProduct.name);
        
        if (existingIndex !== -1) {
            // Update existing product
            savedProducts[existingIndex] = currentProduct;
        } else {
            // Add new product
            savedProducts.push(currentProduct);
        }
        
        // Save to local storage
        saveSavedProducts();
        
        // Update dashboard
        updateDashboard();
        
        // Show success message
        alert(`Product "${currentProduct.name}" has been saved to your dashboard.`);
    }
    
    // Export the current product report as PDF
    function exportReport() {
        if (!currentProduct) return;
        
        // In a real application, this would generate a PDF report
        // For this demo, we'll just show what would be in the report
        alert(`PDF Report for ${currentProduct.name}:
        
Total Carbon Footprint: ${currentProduct.footprint.total.toFixed(2)} kg CO₂e

Breakdown:
- Materials: ${currentProduct.footprint.materials.toFixed(2)} kg CO₂e
- Manufacturing: ${currentProduct.footprint.manufacturing.toFixed(2)} kg CO₂e
- Distribution: ${currentProduct.footprint.distribution.toFixed(2)} kg CO₂e
- Use & End-of-Life: ${currentProduct.footprint.useEol.toFixed(2)} kg CO₂e

Key Details:
- Total Weight: ${currentProduct.details.totalWeight.toFixed(2)} kg
- Energy Consumption: ${currentProduct.details.energyConsumption} kWh
- Energy Source: ${currentProduct.details.energySource}
- Transport Method: ${currentProduct.details.transportMethod}
- Product Lifespan: ${currentProduct.details.productLifespan} years
- Recyclability: ${currentProduct.details.recyclability}%

Report generated by SustainTrack on ${new Date().toLocaleString()}`);
    }
    
    // Update the dashboard with saved products
    function updateDashboard() {
        // Update saved products list
        updateSavedProductsList();
        
        // Update charts
        updateComparisonChart();
        updateCategoryChart();
        updateTrendChart();
        
        // Scroll to dashboard if no products are displayed in results
        if (!resultsSection.classList.contains('hidden') && !currentProduct) {
            document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    // Update the saved products list in the dashboard// Update the saved products list in the dashboard
    function updateSavedProductsList() {
        // Clear the list
        savedProductsList.innerHTML = '';
        
        // Show message if no products
        if (savedProducts.length === 0) {
            savedProductsList.appendChild(noProductsMessage);
            return;
        }
        
        // Filter products based on selected filter
        let filteredProducts = [...savedProducts];
        
        switch (dashboardFilter.value) {
            case 'recent':
                filteredProducts.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'highest':
                filteredProducts.sort((a, b) => b.footprint.total - a.footprint.total);
                break;
            case 'lowest':
                filteredProducts.sort((a, b) => a.footprint.total - b.footprint.total);
                break;
        }
        
        // Add products to list
        filteredProducts.forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = 'product-item';
            productItem.innerHTML = `
                <div>${product.name}</div>
                <div>${product.footprint.total.toFixed(2)} kg CO₂e</div>
            `;
            
            // Add click event to view product details
            productItem.addEventListener('click', () => {
                currentProduct = product;
                displayResults();
            });
            
            savedProductsList.appendChild(productItem);
        });
    }
    
    // Initialize charts
    function initializeCharts() {
        // Initialize empty charts
        const comparisonCtx = document.getElementById('comparison-chart').getContext('2d');
        comparisonChart = new Chart(comparisonCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Carbon Footprint (kg CO₂e)',
                    data: [],
                    backgroundColor: '#3498db'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Carbon Footprint (kg CO₂e)'
                        }
                    }
                }
            }
        });
        
        const categoryCtx = document.getElementById('category-chart').getContext('2d');
        categoryChart = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: ['Materials', 'Manufacturing', 'Distribution', 'Use & End-of-Life'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#3498db', '#2ecc71', '#9b59b6', '#f39c12']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        const trendCtx = document.getElementById('trend-chart').getContext('2d');
        trendChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Average Carbon Footprint',
                    data: [],
                    borderColor: '#2ecc71',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Carbon Footprint (kg CO₂e)'
                        }
                    }
                }
            }
        });
    }
    
    // Update the comparison chart
    function updateComparisonChart() {
        if (savedProducts.length === 0) return;
        
        // Update chart data
        comparisonChart.data.labels = savedProducts.map(p => p.name);
        comparisonChart.data.datasets[0].data = savedProducts.map(p => p.footprint.total);
        
        // Update chart
        comparisonChart.update();
    }
    
    // Update the category chart
    function updateCategoryChart() {
        if (savedProducts.length === 0) return;
        
        // Calculate total footprint for each category
        const materials = savedProducts.reduce((sum, p) => sum + p.footprint.materials, 0);
        const manufacturing = savedProducts.reduce((sum, p) => sum + p.footprint.manufacturing, 0);
        const distribution = savedProducts.reduce((sum, p) => sum + p.footprint.distribution, 0);
        const useEol = savedProducts.reduce((sum, p) => sum + p.footprint.useEol, 0);
        
        // Update chart data
        categoryChart.data.datasets[0].data = [materials, manufacturing, distribution, useEol];
        
        // Update chart
        categoryChart.update();
    }
    
    // Update the trend chart
    function updateTrendChart() {
        if (savedProducts.length === 0) return;
        
        // Group products by month
        const months = {};
        
        savedProducts.forEach(product => {
            const date = new Date(product.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
            
            if (!months[monthKey]) {
                months[monthKey] = {
                    total: 0,
                    count: 0
                };
            }
            
            months[monthKey].total += product.footprint.total;
            months[monthKey].count++;
        });
        
        // Calculate average for each month
        const labels = [];
        const data = [];
        
        Object.keys(months).sort().forEach(monthKey => {
            const [year, month] = monthKey.split('-');
            labels.push(`${month}/${year}`);
            data.push(months[monthKey].total / months[monthKey].count);
        });
        
        // Update chart data
        trendChart.data.labels = labels;
        trendChart.data.datasets[0].data = data;
        
        // Update chart
        trendChart.update();
    }
    
    // Populate recommendations based on general sustainability principles
    function populateRecommendations() {
        // Material recommendations
        materialRecommendations.innerHTML = `
            <li>Use recycled materials when possible to reduce virgin material extraction impacts</li>
            <li>Lightweight design to reduce material usage without compromising durability</li>
            <li>Source materials locally to reduce transportation emissions</li>
            <li>Replace high-impact materials with sustainable alternatives</li>
        `;
        
        // Energy recommendations
        energyRecommendations.innerHTML = `
            <li>Switch to renewable energy sources for manufacturing</li>
            <li>Implement energy efficiency measures in production facilities</li>
            <li>Optimize manufacturing processes to reduce energy consumption</li>
            <li>Conduct energy audits to identify improvement opportunities</li>
        `;
        
        // Transport recommendations
        transportRecommendations.innerHTML = `
            <li>Optimize shipping routes to minimize distance traveled</li>
            <li>Use lower-emission transport methods when feasible (rail vs. truck, ship vs. air)</li>
            <li>Implement efficient packaging to maximize transport space utilization</li>
            <li>Consider local distribution centers to reduce final delivery distances</li>
        `;
        
        // Lifecycle recommendations
        lifecycleRecommendations.innerHTML = `
            <li>Design products for longer lifespans with easier maintenance and repair</li>
            <li>Improve recyclability through design choices and material selection</li>
            <li>Consider take-back programs for end-of-life product management</li>
            <li>Reduce energy consumption during product use phase</li>
        `;
    }
    
    // Load saved products from local storage
    function loadSavedProducts() {
        const savedData = localStorage.getItem('sustainTrack_products');
        return savedData ? JSON.parse(savedData) : [];
    }
    
    // Save products to local storage
    function saveSavedProducts() {
        localStorage.setItem('sustainTrack_products', JSON.stringify(savedProducts));
    }
});