var currency_unit = null;
var colorMap = null;
var allTransactions = [];
var budgets = [];
var startDate = null;
var endDate = null;
var chart = null;


// Period Bar
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const applyBtn = document.getElementById('apply-range');
const presets = document.querySelectorAll('.bg-preset');

// Bar Chart Panel
const chartCanvas = document.getElementById('spending-bar-chart');
const chartSubText = document.getElementById('bg-chart-sub');
const totalEl = document.getElementById('bg-total');
const avgEl = document.getElementById('bg-avg');

// Budget Cards
const cardsGrid = document.getElementById('budget-cards');
const cardsSubText = document.getElementById('bg-cards-sub');

// AI Insights
const aiInsightsEl = document.getElementById('ai-insights');


// Update functions for each section

function updateBarChart(transactions, start, end) {
    /*

    Updates the bar chart with spending data bucketed by day, week, or month depending on the date range length.

    Args:
        transactions: An array of transaction objects.
        start: The start of the date range.
        end: The end of the date range.

    */

    const bucketed = bucketSpending(transactions, start, end);

    if (chart) chart.destroy();

    chart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: bucketed.labels,
            datasets: [{
                label: 'Spending',
                data: bucketed.data,
                backgroundColor: bucketed.data.map((_, i) =>
                    i === bucketed.data.length - 1 ? '#3b82f6' : '#93c5fd'
                ),
                borderRadius: 6,
                borderSkipped: false,
                maxBarThickness: 42
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
                        label: (ctx) => '  ' + priceFormatter(ctx.parsed.y)
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 11 },
                        callback: (v) => '$' + v
                    }
                }
            }
        }
    });

    chartSubText.textContent = `${capitalize(bucketed.granularity)}-by-${bucketed.granularity} breakdown · ${bucketed.labels.length} ${bucketed.granularity}s`;
    const total = bucketed.data.reduce((a, b) => a + b, 0);
    const avg = bucketed.data.length > 0 ? total / bucketed.data.length : 0;
    totalEl.textContent = priceFormatter(total);
    avgEl.textContent = priceFormatter(avg);
}

function updateBudgetCards(transactions, start, end, budgetList) {
    /*

    Updates the budget cards grid based on the spending of each category in the given date range.

    Args:
        transactions: An array of transaction objects.
        start: The start of the date range.
        end: The end of the date range.
        budgetList: An array of budget objects, each with a category and limit.

    */

    cardsGrid.innerHTML = '';

    const spentByCategory = {};
    transactions.forEach(tx => {
        const d = new Date(tx.date);
        if (tx.amount < 0 && d >= start && d <= end) {
            const cat = tx.category.toLowerCase();
            spentByCategory[cat] = (spentByCategory[cat] || 0) + Math.abs(tx.amount);
        }
    });

    budgetList.forEach(b => {
        const spent = spentByCategory[b.category] || 0;
        const percent = (spent / b.limit) * 100;

        let status, statusLabel;
        if (percent < 75) { status = 'ok'; statusLabel = 'On track'; }
        else if (percent < 100) { status = 'warn'; statusLabel = 'Watch'; }
        else { status = 'over'; statusLabel = 'Over'; }

        const fillWidth = Math.min(percent, 100);
        const color = colorMap[b.category]?.color || colorMap['other'].color;

        cardsGrid.insertAdjacentHTML('beforeend', `
            <div class="bg-card">
                <div class="bg-card-top">
                    <div class="bg-card-cat">
                        <div class="bg-card-dot" style="background:${color}"></div>
                        <div class="bg-card-name">${capitalize(b.category)}</div>
                    </div>
                    <span class="bg-card-status ${status}">${statusLabel}</span>
                </div>
                <div class="bg-card-amounts">
                    <span class="bg-card-spent">${priceFormatter(spent)}</span>
                    <span class="bg-card-of">of ${priceFormatter(b.limit)}</span>
                </div>
                <div class="bg-card-bar">
                    <div class="bg-card-fill ${status}" style="width:${fillWidth}%"></div>
                </div>
                <div class="bg-card-foot">
                    <span>${Math.round(percent)}% used</span>
                    <span>${priceFormatter(Math.max(0, b.limit - spent))} left</span>
                </div>
            </div>
        `);
    });

    cardsSubText.textContent = `${budgetList.length} categories · range ${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
}

function updateAIInsights(transactions, start, end, budgetList) {
    /*

    Updates the AI recommendations panel with insights derived from the user's spending in the date range.

    Args:
        transactions: An array of transaction objects.
        start: The start of the date range.
        end: The end of the date range.
        budgetList: An array of budget objects.

    */

    aiInsightsEl.innerHTML = '';

    const inRange = transactions.filter(tx => {
        const d = new Date(tx.date);
        return tx.amount < 0 && d >= start && d <= end;
    });
    const totalSpend = inRange.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const catTotals = {};
    inRange.forEach(tx => {
        const c = tx.category.toLowerCase();
        catTotals[c] = (catTotals[c] || 0) + Math.abs(tx.amount);
    });
    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCats[0] || ['nothing', 0];
    const topPct = totalSpend > 0 ? Math.round((topCategory[1] / totalSpend) * 100) : 0;

    const overBudget = budgetList.filter(b => (catTotals[b.category] || 0) > b.limit);

    const insights = [
        {
            icon: '💡',
            title: 'Your biggest expense category',
            body: `<strong>${capitalize(topCategory[0])}</strong> accounts for <strong>${topPct}%</strong> of your spending in this period (${priceFormatter(topCategory[1])}). Consider whether this matches your priorities.`
        },
        {
            icon: '📊',
            title: 'Spending pace',
            body: `You've spent <strong>${priceFormatter(totalSpend)}</strong> over this period. ${totalSpend > 1500 ? 'That\'s a notable amount — review your discretionary categories.' : 'You\'re tracking moderately — keep an eye on recurring costs.'}`
        },
        {
            icon: overBudget.length > 0 ? '⚠️' : '✅',
            title: overBudget.length > 0 ? `${overBudget.length} budget${overBudget.length > 1 ? 's' : ''} exceeded` : 'All budgets on track',
            body: overBudget.length > 0
                ? `You've gone over budget in: <strong>${overBudget.map(b => capitalize(b.category)).join(', ')}</strong>. Try setting a stricter cap next period or cut a subscription you don't use.`
                : `Nice work — every category is within its limit. You're building strong financial habits.`
        },
        {
            icon: '🎯',
            title: 'Suggested action',
            body: `Try the <strong>50/30/20 rule</strong>: 50% needs, 30% wants, 20% savings. Based on your patterns, reducing dining and subscriptions by 10% could save you <strong>${priceFormatter(totalSpend * 0.05)}</strong>/period.`
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




// Utility functions

function priceFormatter(amount) {
    /*
    Formats a given amount as a currency string based on the specified currency unit.

    Args:
        amount: The numerical amount to be formatted.

    Returns:
        A string representing the formatted currency amount according to the specified currency unit.
    */

    return amount.toLocaleString('en-US', { style: 'currency', currency: currency_unit });
}

function capitalize(s) {
    /*
    Capitalizes the first letter of a given string and converts the rest to lowercase.

    Args:
        s: The input string to be capitalized.

    Returns:
        A new string with the first letter capitalized and the rest in lowercase.

    */

    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatDateForInput(date) {
    /*
    Converts a Date object to a YYYY-MM-DD string for use with <input type="date">.

    Args:
        date: A Date object.

    Returns:
        A YYYY-MM-DD string.
    */

    return date.toISOString().split('T')[0];
}

function formatDateLabel(date, granularity) {
    /*
    Formats a date for display on the bar chart based on the chosen granularity.

    Args:
        date: A Date object.
        granularity: One of 'day', 'week', or 'month'.

    Returns:
        A short label string suitable for axis ticks.
    */

    if (granularity === 'day')   return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (granularity === 'week')  return `Wk of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    if (granularity === 'month') return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    return date.toLocaleDateString('en-US');
}

function daysBetween(start, end) {
    /*
    Returns the number of days between two Date objects, rounded up.

    Args:
        start: The start Date.
        end: The end Date.

    Returns:
        The number of days, as a number.
    */

    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

function bucketSpending(transactions, start, end) {
    /*
    Groups expenses inside the date range into buckets of equal duration (day, week, or month) and sums each bucket.

    Args:
        transactions: An array of transaction objects.
        start: The start Date of the range.
        end: The end Date of the range.

    Returns:
        An object with `granularity`, `labels`, and `data` arrays for the bar chart.
    */

    const inRange = transactions.filter(tx => {
        const d = new Date(tx.date);
        return tx.amount < 0 && d >= start && d <= end;
    });

    const totalDays = daysBetween(start, end);

    let granularity;
    if (totalDays <= 14)      granularity = 'day';
    else if (totalDays <= 60) granularity = 'week';
    else                      granularity = 'month';

    const buckets = new Map();

    if (granularity === 'day') {
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const key = formatDateForInput(d);
            buckets.set(key, { label: formatDateLabel(new Date(d), 'day'), total: 0 });
        }
    } else if (granularity === 'week') {
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
            const key = formatDateForInput(d);
            buckets.set(key, { label: formatDateLabel(new Date(d), 'week'), total: 0 });
        }
    } else {
        const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
        while (cursor <= end) {
            const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
            buckets.set(key, { label: formatDateLabel(new Date(cursor), 'month'), total: 0 });
            cursor.setMonth(cursor.getMonth() + 1);
        }
    }

    inRange.forEach(tx => {
        const d = new Date(tx.date);
        let key;
        if (granularity === 'day') {
            key = formatDateForInput(d);
        } else if (granularity === 'week') {
            const dStr = formatDateForInput(d);
            const keys = [...buckets.keys()].sort();
            key = keys.filter(k => k <= dStr).pop() || keys[0];
        } else {
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        if (buckets.has(key)) {
            buckets.get(key).total += Math.abs(tx.amount);
        }
    });

    return {
        granularity,
        labels: [...buckets.values()].map(b => b.label),
        data:   [...buckets.values()].map(b => Math.round(b.total * 100) / 100)
    };
}



// Main function to update the entire budgets page with new data
export function updateBudgetsPage() {
    /*
    Refreshes the bar chart, budget cards, and AI panel based on the current date range.
    */

    if (!startDate || !endDate) return;
    if (startDate > endDate) {
        alert('Start date must be before end date.');
        return;
    }

    updateBarChart(allTransactions, startDate, endDate);
    updateBudgetCards(allTransactions, startDate, endDate, budgets);
    updateAIInsights(allTransactions, startDate, endDate, budgets);
}



// Event listeners

applyBtn.addEventListener('click', () => {
    startDate = new Date(startDateInput.value);
    endDate = new Date(endDateInput.value);
    endDate.setHours(23, 59, 59, 999);
    presets.forEach(p => p.classList.remove('active'));
    updateBudgetsPage();
});

presets.forEach(btn => {
    btn.addEventListener('click', () => {
        const days = parseInt(btn.dataset.preset);
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - days + 1);
        start.setHours(0, 0, 0, 0);

        startDateInput.value = formatDateForInput(start);
        endDateInput.value = formatDateForInput(today);

        startDate = start;
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);

        presets.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        updateBudgetsPage();
    });
});


document.addEventListener("DOMContentLoaded", () => {
    const data = {
        "currency_unit": "USD",
        "budgets": [
            { "category": "rent",          "limit": 1000 },
            { "category": "food",          "limit": 400 },
            { "category": "transport",     "limit": 200 },
            { "category": "utilities",     "limit": 150 },
            { "category": "subscriptions", "limit": 60 },
            { "category": "entertainment", "limit": 100 },
            { "category": "fuel",          "limit": 120 },
            { "category": "shopping",      "limit": 150 }
        ],
        "transaction_history": [
            { "amount":  3000.00, "description": "May Salary",       "category": "salary",        "date": "2026-05-01" },
            { "amount":  -900.00, "description": "May Rent",         "category": "rent",          "date": "2026-05-01" },
            { "amount":   -62.00, "description": "Electricity",      "category": "utilities",     "date": "2026-05-02" },
            { "amount":   -15.99, "description": "Netflix",          "category": "subscriptions", "date": "2026-05-03" },
            { "amount":   -45.50, "description": "Walmart",          "category": "food",          "date": "2026-05-04" },
            { "amount":   -25.00, "description": "Uber",             "category": "transport",     "date": "2026-05-05" },
            { "amount":   -19.01, "description": "Spotify",          "category": "subscriptions", "date": "2026-05-06" },
            { "amount":   -60.00, "description": "Restaurant",       "category": "food",          "date": "2026-05-08" },
            { "amount":   -20.00, "description": "Movie",            "category": "entertainment", "date": "2026-05-10" },
            { "amount":   -40.00, "description": "Lunch",            "category": "food",          "date": "2026-05-12" },
            { "amount":   -60.00, "description": "Bus pass",         "category": "transport",     "date": "2026-05-15" },
            { "amount":   -55.00, "description": "Gas station",      "category": "fuel",          "date": "2026-05-18" },
            { "amount":   -85.00, "description": "Amazon",           "category": "shopping",      "date": "2026-05-20" },
            { "amount":   -32.00, "description": "Pharmacy",         "category": "healthcare",    "date": "2026-05-22" },
            { "amount":   -28.00, "description": "Coffee shop",      "category": "food",          "date": "2026-05-25" },
            { "amount":  3000.00, "description": "April Salary",     "category": "salary",        "date": "2026-04-01" },
            { "amount":  -900.00, "description": "April Rent",       "category": "rent",          "date": "2026-04-01" },
            { "amount":   -67.50, "description": "Walmart",          "category": "food",          "date": "2026-04-30" },
            { "amount":   -12.00, "description": "Starbucks",        "category": "food",          "date": "2026-04-29" },
            { "amount":   -55.00, "description": "Gas station",      "category": "fuel",          "date": "2026-04-15" },
            { "amount":   -42.00, "description": "Restaurant",       "category": "food",          "date": "2026-04-20" },
            { "amount":   -35.00, "description": "Concert tickets",  "category": "entertainment", "date": "2026-04-25" }
        ]
    };
    colorMap = {
        "food":          { "color": '#F97316', "bg": '#FFEDD5' },
        "transport":     { "color": '#0EA5E9', "bg": '#E0F2FE' },
        "utilities":     { "color": '#EAB308', "bg": '#FEF9C3' },
        "rent":          { "color": '#DC2626', "bg": '#FEE2E2' },
        "healthcare":    { "color": '#10B981', "bg": '#D1FAE5' },
        "shopping":      { "color": '#EC4899', "bg": '#FCE7F3' },
        "entertainment": { "color": '#8B5CF6', "bg": '#EDE9FE' },
        "education":     { "color": '#3B82F6', "bg": '#DBEAFE' },
        "insurance":     { "color": '#475569', "bg": '#F1F5F9' },
        "subscriptions": { "color": '#06B6D4', "bg": '#CFFAFE' },
        "fuel":          { "color": '#78350F', "bg": '#FEF3C7' },
        "salary":        { "color": '#16A34A', "bg": '#DCFCE7' },
        "other":         { "color": '#94A3B8', "bg": '#F1F5F9' }
    };

    currency_unit = data.currency_unit || 'USD';
    allTransactions = data.transaction_history;
    budgets = data.budgets;

    // Default to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    startDateInput.value = formatDateForInput(thirtyDaysAgo);
    endDateInput.value = formatDateForInput(today);

    startDate = thirtyDaysAgo;
    endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    document.querySelector('.bg-preset[data-preset="30"]').classList.add('active');

    updateBudgetsPage();
});