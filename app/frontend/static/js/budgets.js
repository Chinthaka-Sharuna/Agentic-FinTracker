var currency_unit = null;
var colorMap = null;
var chart = null;

// Period Bar
const startDateInput = document.getElementById('start-date');
const endDateInput   = document.getElementById('end-date');
const applyBtn       = document.getElementById('apply-range');
const presets        = document.querySelectorAll('.bg-preset');

// Bar Chart Panel
const chartWrap    = document.querySelector('.bg-chart-wrap');
const chartSubText = document.getElementById('bg-chart-sub');
const totalEl      = document.getElementById('bg-total');
const avgEl        = document.getElementById('bg-avg');

// Budget Cards
const cardsGrid    = document.getElementById('budget-cards');
const cardsSubText = document.getElementById('bg-cards-sub');

// AI Insights
const aiInsightsEl = document.getElementById('ai-insights');
var aiPanel = null;


// ─── Bar chart ────────────────────────────────────────────────────────────────

function updateBarChart(catagaried_by_date) {
    if (!catagaried_by_date || catagaried_by_date.length === 0) {
        chartSubText.textContent = 'No spending data for this period.';
        totalEl.textContent = priceFormatter(0);
        avgEl.textContent   = priceFormatter(0);
        if (chart) { chart.destroy(); chart = null; }

        chartWrap.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;">
                <div style="font-size:36px;">📭</div>
                <p style="font-size:15px;font-weight:600;color:var(--ink);margin:0;">No spending data</p>
                <p style="font-size:13px;color:var(--ink-muted);margin:0;">Try a different date range or log some expenses first.</p>
            </div>`;
        return;
    }

    // restore canvas if empty state was shown before
    if (!chartWrap.querySelector('canvas')) {
        chartWrap.innerHTML = '<canvas id="spending-bar-chart"></canvas>';
    }

    const canvas     = chartWrap.querySelector('canvas');
    const labels     = catagaried_by_date.map(d => d.date);
    const percentages = catagaried_by_date.map(d => d.percentage);
    const total_cost =catagaried_by_date.map(d => parseFloat(d.total_spends || 0));

    if (chart) chart.destroy();

    chart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Spending %',
                data: percentages,
                backgroundColor: '#93c5fd',
                borderColor: '#3b82f6',
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
                maxBarThickness: 20,
                barPercentage: 0.9,
                categoryPercentage: 0.8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    padding: 10,
                    titleFont: { weight: 600 },
                    callbacks: {
                        label: (ctx) => {
                            const cost = parseFloat(catagaried_by_date[ctx.dataIndex].total_cost || 0);
                            return [
                                `  ${ctx.parsed.y}% of total`,
                                `  ${priceFormatter(cost)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 10 },
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 11 },
                        callback: (v) => v + '%'
                    }
                }
            }
        }
    });
    const totalSpent = total_cost.reduce((sum, d) => sum + d, 0);
    const avgPerDay      = total_cost.length > 0 ? totalSpent / total_cost.length : 0;
    totalEl.textContent  = priceFormatter(totalSpent);
    avgEl.textContent    = priceFormatter(avgPerDay);
    chartSubText.textContent = `Daily spending breakdown · ${total_cost.length} days`;
}


// ─── Budget cards ─────────────────────────────────────────────────────────────

function updateBudgetCards(data) {
    cardsGrid.innerHTML = '';

    if (!data || data.length === 0) {
        cardsGrid.innerHTML = `
            <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            gap: 8px;
            width: 100%;
            grid-column: 1 / -1;
            text-align: center;
        ">
            <div style="font-size:36px;">📭</div>
            <p style="font-size:15px;font-weight:600;color:var(--ink);margin:0;">No spending data</p>
            <p style="font-size:13px;color:var(--ink-muted);margin:0;">Try a different date range or log some expenses first.</p>
        </div>`;
        cardsSubText.textContent = 'No data for this period';
        return;
    }

    data.forEach(item => {
        const pct = item.percentage;

        let status, statusLabel;
        if (pct < 20)      { status = 'ok';   statusLabel = 'Low';      }
        else if (pct < 40) { status = 'ok';   statusLabel = 'Moderate'; }
        else if (pct < 60) { status = 'warn'; statusLabel = 'High';     }
        else               { status = 'over'; statusLabel = 'Dominant'; }

        cardsGrid.insertAdjacentHTML('beforeend', `
            <div class="bg-card">
                <div class="bg-card-top">
                    <div class="bg-card-cat">
                        <div class="bg-card-name">${capitalize(item.category)}</div>
                    </div>
                    <span class="bg-card-status ${status}">${statusLabel}</span>
                </div>
                <div class="bg-card-amounts">
                    <span class="bg-card-spent">${priceFormatter(parseFloat(item.total_cost || 0))}</span>
                    <span class="bg-card-of">of total</span>
                </div>
                <div class="bg-card-bar">
                    <div class="bg-card-fill ${status}" style="width:${Math.min(pct, 100)}%"></div>
                </div>
                <div class="bg-card-foot">
                    <span>${pct}% of spending</span>
                    <span>${priceFormatter(parseFloat(item.total_cost || 0))}</span>
                </div>
            </div>
        `);
    });

    cardsSubText.textContent = `${data.length} days tracked`;
}


// ─── AI Insights ──────────────────────────────────────────────────────────────

function updateAIInsights(data) {
    data=[]
    aiInsightsEl.innerHTML = '';

    if (!data || data.length === 0) {
        aiPanel.style.display = 'none';
        return;
    }

    aiPanel.style.display = 'block';

    const totalSpent = data.reduce((sum, d) => sum + parseFloat(d.total_cost || 0), 0);
    const topDay     = data.reduce((max, d) => parseFloat(d.total_cost) > parseFloat(max.total_cost) ? d : max, data[0]);
    const topPct     = topDay.percentage;

    const insights = [
        {
            icon: '💡',
            title: 'Highest spending day',
            body: `<strong>${topDay.date}</strong> was your biggest spending day at <strong>${priceFormatter(parseFloat(topDay.total_cost))}</strong> — that's <strong>${topPct}%</strong> of your total spending this period.`
        },
        {
            icon: '📊',
            title: 'Total spending overview',
            body: `You spent <strong>${priceFormatter(totalSpent)}</strong> across <strong>${data.length}</strong> days. ${totalSpent > 2000 ? 'That\'s a significant amount — review your discretionary spending.' : 'You\'re tracking at a moderate level — keep monitoring recurring costs.'}`
        },
        {
            icon: '🎯',
            title: 'Suggested action',
            body: `Try the <strong>50/30/20 rule</strong>: 50% needs, 30% wants, 20% savings. Reducing your highest spending days by 10% could save you <strong>${priceFormatter(totalSpent * 0.1)}</strong> this period.`
        },
        {
            icon: data.length > 15 ? '⚠️' : '✅',
            title: data.length > 15 ? 'Frequent spending days' : 'Controlled spending frequency',
            body: data.length > 15
                ? `You had spending on ${data.length} days this period. Try designating specific shopping days to reduce impulse spending.`
                : `You kept spending to ${data.length} days this period — a focused approach that makes budgeting easier.`
        }
    ];

    insights.forEach(i => {
        aiInsightsEl.insertAdjacentHTML('beforeend', `
            <div class="bg-ai-insight">
                <div class="bg-ai-insight-icon">${i.icon}</div>
                <div class="bg-ai-insight-content">
                    <p class="bg-ai-insight-title">${i.title}</p>
                    <p class="bg-ai-insight-body">${i.body}</p>
                </div>
            </div>
        `);
    });
}


// ─── Fetch data for a date range ──────────────────────────────────────────────

async function fetchAndUpdate(startStr, endStr) {
    try {
        const res = await authFetch('/api/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start_date: startStr, end_date: endStr })
        });
        if (!res.ok) throw new Error('Failed to fetch budget data');
        const data       = await res.json();
        currency_unit    = data.currency_unit || 'USD';
        updateBarChart(data.categorized_data_by_date || []);
        updateBudgetCards(data.categorized_data_by_category || []);
        updateAIInsights(data.categorized_data_by_category || []);
    } catch (err) {
        console.error('Budget fetch error:', err);
        aiInsightsEl.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;padding:40px;gap:8px;">
                <div style="font-size:36px;">⚠️</div>
                <p style="font-size:15px;font-weight:600;color:var(--ink);margin:0;">Failed to load budget data</p>
                <p style="font-size:13px;color:var(--ink-muted);margin:0;">Please refresh the page.</p>
            </div>`;
    }
}


// ─── Utilities ───────────────────────────────────────────────────────────────

function priceFormatter(amount) {
    return (amount || 0).toLocaleString('en-US', { style: 'currency', currency: currency_unit || 'USD' });
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatDateForInput(date) {
    const year  = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day   = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ─── Event listeners ─────────────────────────────────────────────────────────

applyBtn.addEventListener('click', () => {
    const startStr = startDateInput.value;
    const endStr   = endDateInput.value;
    if (!startStr || !endStr) return;
    if (startStr > endStr) { alert('Start date must be before end date.'); return; }
    presets.forEach(p => p.classList.remove('active'));
    fetchAndUpdate(startStr, endStr);
});

presets.forEach(btn => {
    btn.addEventListener('click', () => {
        const days  = parseInt(btn.dataset.preset);
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - days + 1);

        const startStr = formatDateForInput(start);
        const endStr   = formatDateForInput(today);

        startDateInput.value = startStr;
        endDateInput.value   = endStr;

        presets.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        fetchAndUpdate(startStr, endStr);
    });
});


// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    colorMap = {
        food:          { color: '#F97316', bg: '#FFEDD5' },
        transport:     { color: '#0EA5E9', bg: '#E0F2FE' },
        utilities:     { color: '#EAB308', bg: '#FEF9C3' },
        rent:          { color: '#DC2626', bg: '#FEE2E2' },
        healthcare:    { color: '#10B981', bg: '#D1FAE5' },
        shopping:      { color: '#EC4899', bg: '#FCE7F3' },
        entertainment: { color: '#8B5CF6', bg: '#EDE9FE' },
        education:     { color: '#3B82F6', bg: '#DBEAFE' },
        insurance:     { color: '#475569', bg: '#F1F5F9' },
        subscriptions: { color: '#06B6D4', bg: '#CFFAFE' },
        fuel:          { color: '#78350F', bg: '#FEF3C7' },
        other:         { color: '#94A3B8', bg: '#F1F5F9' }
    };

    // default to current month first date → today
    const today        = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const startStr = formatDateForInput(firstOfMonth);
    const endStr   = formatDateForInput(today);
    aiPanel = document.querySelector('.bg-ai-panel');

    startDateInput.value = startStr;
    endDateInput.value   = endStr;

    await fetchAndUpdate(startStr, endStr);
});