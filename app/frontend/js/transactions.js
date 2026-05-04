var currency_unit = null;
var colorMap = null;
var allTransactions = [];
var openingBalance = 0;
var activeMonth = 'all';
var searchTerm = '';


// Summary Strip
const txCount = document.getElementById('tx-count');
const txTotalCredit = document.getElementById('tx-total-credit');
const txTotalDebit = document.getElementById('tx-total-debit');
const txNet = document.getElementById('tx-net');

// Panel
const txPanelSub = document.getElementById('tx-panel-sub');
const monthFilter = document.getElementById('month-filter');

// Table
const tbody = document.getElementById('tx-tbody');
const txEmpty = document.getElementById('tx-empty');

// Search
const txSearch = document.getElementById('tx-search');


// Update functions for each section

function updateSummaryStrip(transactions) {
    /*

    Updates the summary strip with the count, total credit, total debit, and net of the visible transactions.

    Args:
        transactions: An array of transaction objects currently displayed in the table.

    */

    let totalCredit = 0;
    let totalDebit = 0;

    transactions.forEach(tx => {
        if (tx.amount > 0) totalCredit += tx.amount;
        else totalDebit += Math.abs(tx.amount);
    });

    const net = totalCredit - totalDebit;

    txCount.textContent = `${transactions.length} transaction${transactions.length === 1 ? '' : 's'}`;
    txTotalCredit.textContent = priceFormatter(totalCredit);
    txTotalDebit.textContent = priceFormatter(totalDebit);
    txNet.textContent = priceFormatter(net);

    txNet.classList.remove('income', 'expense');
    if (net > 0) txNet.classList.add('income');
    else if (net < 0) txNet.classList.add('expense');

    txPanelSub.textContent = activeMonth === 'all'
        ? `Showing all ${transactions.length} transactions`
        : `Showing ${transactions.length} transactions for ${getMonthLabel(activeMonth)}`;
}

function updateMonthFilter(transactions) {
    /*

    Populates the month filter dropdown with one option per month found in the given transactions, sorted newest first.

    Args:
        transactions: An array of transaction objects, each containing a date.

    */

    const months = [...new Set(transactions.map(tx => getMonthKey(tx.date)))]
        .sort()
        .reverse();

    months.forEach(monthKey => {
        const opt = document.createElement('option');
        opt.value = monthKey;
        opt.textContent = getMonthLabel(monthKey);
        monthFilter.appendChild(opt);
    });
}

function updateTransactionTable(transactions) {
    /*

    Updates the transaction table with the given transactions, displaying newest first.

    Args:
        transactions: An array of transaction objects with a precomputed running balance.

    */

    tbody.innerHTML = '';

    if (transactions.length === 0) {
        txEmpty.style.display = 'block';
        return;
    }
    txEmpty.style.display = 'none';

    // Display newest first
    const displayList = [...transactions].reverse();

    displayList.forEach(tx => {
        const isCredit = tx.amount > 0;
        const debit = isCredit ? '' : priceFormatter(Math.abs(tx.amount));
        const credit = isCredit ? priceFormatter(tx.amount) : '';
        const category = capitalize(tx.category);
        const dotColor = colorMap[tx.category]?.color || colorMap['other'].color;

        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td class="col-date">${formatDate(tx.date)}</td>
                <td class="col-tx">
                    <div class="tx-cell">
                        <span class="tx-cell-dot" style="background:${dotColor}"></span>
                        <div>
                            <div class="tx-cell-desc">${tx.description}</div>
                            <div class="tx-cell-cat">${category}</div>
                        </div>
                    </div>
                </td>
                <td class="col-num debit">${debit}</td>
                <td class="col-num credit">${credit}</td>
                <td class="col-num balance">${priceFormatter(tx.balance)}</td>
            </tr>
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

function formatDate(dateStr) {
    /*
    Converts a YYYY-MM-DD date string into a readable label like "May 15, 2026".

    Args:
        dateStr: An ISO date string.

    Returns:
        A formatted date string for display.
    */

    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getMonthKey(dateStr) {
    /*
    Extracts the YYYY-MM portion from a date string, used as a unique key per month.

    Args:
        dateStr: An ISO date string (YYYY-MM-DD).

    Returns:
        A YYYY-MM string.
    */

    return dateStr.slice(0, 7);
}

function getMonthLabel(monthKey) {
    /*
    Converts a YYYY-MM key into a human-readable label like "May 2026".

    Args:
        monthKey: A YYYY-MM string.

    Returns:
        A formatted month-and-year string.
    */

    const [year, month] = monthKey.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function withRunningBalance(transactions, startingBalance) {
    /*
    Sorts transactions oldest to newest and computes a running balance for each one.

    Args:
        transactions: An array of transaction objects.
        startingBalance: The balance prior to the earliest transaction.

    Returns:
        A new array of transactions with a `balance` field added to each.
    */

    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let balance = startingBalance;
    return sorted.map(tx => {
        balance += tx.amount;
        return { ...tx, balance };
    });
}

function getFilteredTransactions() {
    /*
    Returns only the transactions that match the current month filter and search term.

    Returns:
        A filtered array of transaction objects.
    */

    return allTransactions.filter(tx => {
        const monthMatch = activeMonth === 'all' || getMonthKey(tx.date) === activeMonth;
        const searchMatch = searchTerm === '' ||
            tx.description.toLowerCase().includes(searchTerm) ||
            tx.category.toLowerCase().includes(searchTerm);
        return monthMatch && searchMatch;
    });
}



// Main function to update the entire transactions page with new data
export function updateTransactionsPage(data) {
    /*
    Refreshes every element on the transactions page based on the latest filter and search state.

    Args:
        data: Optional. If passed, it will reload all data from scratch (used on first load).
    */

    if (data) {
        currency_unit = data.currency_unit || 'USD';
        openingBalance = data.opening_balance || 0;
        allTransactions = withRunningBalance(data.transaction_history, openingBalance);
        updateMonthFilter(allTransactions);
    }

    const filtered = getFilteredTransactions();
    updateTransactionTable(filtered);
    updateSummaryStrip(filtered);
}



// Event listeners

monthFilter.addEventListener('change', (e) => {
    activeMonth = e.target.value;
    updateTransactionsPage();
});

txSearch.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    updateTransactionsPage();
});


document.addEventListener("DOMContentLoaded", () => {
    const data = {
        "currency_unit": "USD",
        "opening_balance": 11595.00,
        "transaction_history": [
            {
                "amount": 3000.00,
                "description": "May Salary",
                "category": "salary",
                "date": "2026-05-01"
            },
            {
                "amount": -900.00,
                "description": "May Rent",
                "category": "rent",
                "date": "2026-05-01"
            },
            {
                "amount": -62.00,
                "description": "Electricity bill",
                "category": "utilities",
                "date": "2026-05-02"
            },
            {
                "amount": -15.99,
                "description": "Netflix",
                "category": "subscriptions",
                "date": "2026-05-03"
            },
            {
                "amount": -45.50,
                "description": "Walmart groceries",
                "category": "food",
                "date": "2026-05-04"
            },
            {
                "amount": -25.00,
                "description": "Uber to office",
                "category": "transport",
                "date": "2026-05-05"
            },
            {
                "amount": -19.01,
                "description": "Spotify",
                "category": "subscriptions",
                "date": "2026-05-06"
            },
            {
                "amount": -60.00,
                "description": "Restaurant dinner",
                "category": "food",
                "date": "2026-05-08"
            },
            {
                "amount": -20.00,
                "description": "Movie night",
                "category": "entertainment",
                "date": "2026-05-10"
            },
            {
                "amount": -40.00,
                "description": "Lunch with friends",
                "category": "food",
                "date": "2026-05-12"
            },
            {
                "amount": -60.00,
                "description": "Bus pass",
                "category": "transport",
                "date": "2026-05-15"
            },
            {
                "amount": 3000.00,
                "description": "April Salary",
                "category": "salary",
                "date": "2026-04-01"
            },
            {
                "amount": -900.00,
                "description": "April Rent",
                "category": "rent",
                "date": "2026-04-01"
            },
            {
                "amount": -67.50,
                "description": "Walmart",
                "category": "food",
                "date": "2026-04-30"
            },
            {
                "amount": -12.00,
                "description": "Starbucks",
                "category": "food",
                "date": "2026-04-29"
            },
            {
                "amount": -55.00,
                "description": "Gas station",
                "category": "fuel",
                "date": "2026-04-15"
            }
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

    updateTransactionsPage(data);
});