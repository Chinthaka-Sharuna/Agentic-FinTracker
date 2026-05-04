var currency_unit = null;
const today = new Date();
const date = today.toDateString().split(' ');
var colorMap = null;


// Remaining Card
const billingDate = document.getElementById('billing-date');
const remainingBalance = document.getElementById('remaining-balance');
const remainingBalancePercentage = document.getElementById('remaining-balance-percentage');

// Spent Card
const spentAmount = document.getElementById('spent-amount');
const spentPercentage = document.getElementById('spent-percentage');


// Income Card
const incomeAmount = document.getElementById('income-amount');
const incomeMonthName = document.getElementById('income-month-name');
const lastLoggedIncomeDate = document.getElementById('last-logged-income-date');

// Total Balance Card
const totalBalance = document.getElementById('account-total-balance');
const totalBalancePercentageChange = document.getElementById('total-balance-percentage-change');

// Pie Chart Card
const pieChartMonth = document.getElementById('pie-chart-month-name');
const pieChartCanvas = document.getElementById('pie-chart-month');

// Recent Transactions
const recentTransactionHistory = document.getElementById('recent-transaction-history');

// Greeting and Date
const headingDateLine = document.getElementById('heading-date-line');
const welcomeMessage = document.getElementById('welcome-message');




// Update functions for each card

function updateRemainingCard(remainingBudget,income, billDate = 1) {
    /*

    Updates the remaining budget card with the latest remaining budget,remaining percentage and next bill date.

    Args:
      remainingBudget: The latest remaining budget amount.
      income: The total income for the current month.
      billDate: The day of the month when the next bill is due (default is 1).
      currency_unit: The currency unit for formatting (default is 'USD').
    
    */

    billingDate.textContent = `Until ${date[1]} ${billDate}`;
    let remainingBudgetFormatted=priceFormatter(remainingBudget, currency_unit).split('.');
    remainingBalance.innerHTML = `${remainingBudgetFormatted[0].toLocaleString()}<span class="cents">.${remainingBudgetFormatted[1]}</span>`;
    remainingBalancePercentage.textContent = `${getPercentage(remainingBudget, income, 0)}% remaining`;
}

function updateSpentCard(amount,income) {
    /*

    Updates the spent amount card with the latest spent amount and percentage of income spent.

    Args:
        amount: The latest spent amount.
        income: The total income for the current month.

    */
    spentPercentage.textContent = `${getPercentage(amount, income, 0)}% used`;
    let spentAmountFormatted=priceFormatter(amount).split('.');
    spentAmount.innerHTML = `${spentAmountFormatted[0].toLocaleString()}<span class="cents">.${spentAmountFormatted[1]}</span>`;
}

function updateIncomeCard(amount, lastLoggedDate) {
    /*

    Updates the income card with the latest income amount.

    Args:        
        amount: The latest income amount.
        lastLoggedDate: The date when the income was last logged.

    */

    lastLoggedDate = new Date(lastLoggedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    console.log(lastLoggedDate);
    incomeMonthName.textContent = `${date[1]} Income`;
    lastLoggedIncomeDate.textContent = `Logged ${lastLoggedDate}`;
    let incomeAmountFormatted=priceFormatter(amount).split('.');
    incomeAmount.innerHTML = `${incomeAmountFormatted[0].toLocaleString()}<span class="cents">.${incomeAmountFormatted[1]}</span>`;
}

function updateTotalBalanceCard(totalBalanceAmount, percentageChange) {
    /*

    Updates the total balance card with the latest total balance and percentage change from the previous month.

    Args:

        totalBalanceAmount: The latest total balance amount.
        percentageChange: The percentage change from the previous month (positive for increase, negative for decrease).

    */
   
    totalBalance.textContent = priceFormatter(totalBalanceAmount, currency_unit);
    if (percentageChange > 0) {
        totalBalancePercentageChange.textContent = `↑ ${percentageChange}%`;
        totalBalancePercentageChange.classList.remove('down');
        totalBalancePercentageChange.classList.add('up');
    } else if (percentageChange < 0) {
        totalBalancePercentageChange.textContent = `↓ ${Math.abs(percentageChange)}%`;
        totalBalancePercentageChange.classList.remove('up');
        totalBalancePercentageChange.classList.add('down');
    } else {
        totalBalancePercentageChange.textContent = `0%`;
        totalBalancePercentageChange.classList.remove('up', 'down');
    }
}

function updatePieChartCard(data, elementId) {
    /*

    Updates the pie chart card with the latest category data.


    Args:        
        data: An array of category objects, each containing a name and percentage.
        elementId: The ID of the canvas element where the pie chart will be rendered.
    */

    pieChartMonth.textContent = date[1].toUpperCase();
    let chartData = prepareChartData(data);
    Chart.register(ChartDataLabels);
    new Chart(elementId, {
        type: 'pie',
        data: {
            labels: chartData.labels,
            datasets: [{
                data: chartData.data,
                backgroundColor: chartData.colors
            }]
        },
        options: {
            layout: {
                padding: 30
            },
            plugins: {
                legend: {
                    position: 'bottom'
                },
                datalabels: {
                    color: (ctx) => ctx.dataset.backgroundColor[ctx.dataIndex],
                    font: {
                        size: 14,
                        weight: 'bold'
                    },
                    formatter: (value, ctx) => {
                        const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        const pct = Math.round(value / total * 100);
                        return pct + '%';
                    },
                    anchor: 'end',
                    align: 'end',
                    offset: 8
                }
            }
        }
    });
}

function updateGreeting(message) {
    /*

    Updates the greeting message in the dashboard.

    Args:
        message: The personalized greeting message to be displayed.if massage is empesized use the span html tag to empasize.
        
    */
    welcomeMessage.innerHTML = message;
}

function updateDateLine() {
    /*

    Updates the date line with the current date.

    Args:
        date: The current date to be displayed in the date line.

    */
    headingDateLine.textContent = `${today.toLocaleDateString('en-US', { weekday: 'long' })} · ${date[1]} ${date[2]}, ${date[3]}`;
}




// Utility functions

function priceFormatter(amount) {
    /*
    Formats a given amount as a currency string based on the specified currency unit.

    Args:
        amount: The numerical amount to be formatted.
        currency_unit: The currency unit for formatting (default is 'USD').

    Returns:
        A string representing the formatted currency amount according to the specified currency unit.
    */

    return amount.toLocaleString('en-US', {style: 'currency',currency: currency_unit});
}

function getPercentage(partialValue, totalValue,decimalPlaces = 0) {
    /*

    Calculates the percentage of a partial value relative to a total value and formats it to a specified number of decimal places.

    Args:
        partialValue: The part of the total value for which the percentage is to be calculated.
        totalValue: The total value against which the percentage is calculated.
        decimalPlaces: The number of decimal places to format the result (default is 0).

    Returns:
        A string representing the percentage of the partial value relative to the total value, formatted to the specified number of decimal places.
    */

    return ((partialValue / totalValue) * 100).toFixed(decimalPlaces);
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

function prepareChartData(categories) {
    /*
    Prepares the data for the pie chart by extracting labels, colors, and data values from the given category objects.

    Args:
        categories: An array of category objects, each containing a name and percentage.

    Returns:
        An object containing arrays of labels, colors, and data values for the pie chart.
    
    */


    return {
        labels: categories.map(c => capitalize(c.name)),
        colors: categories.map(c => colorMap[c.name.toLowerCase()].color || colorMap['other'].color),
        data: categories.map(c => c.percentage)
    };
}



// Main function to update the entire dashboard with new data
export function updateDashboard(data) {
    updateRemainingCard(data.summary.remaining_budget,data.summary.total_income,data.next_bill_date,data.currency_unit);
    updateSpentCard(data.summary.spent_amount,data.summary.total_income,data.currency_unit);
    updateIncomeCard(data.summary.total_income, data.last_logged_income_date);
    updateTotalBalanceCard(data.summary.total_balance, data.summary.total_balance_percentage_change);
    updatePieChartCard(data.category, pieChartCanvas);
    updateRecentTransactions(data.transaction_history);
    updateGreeting(`Welcome back, <span>Sharuna</span>.`);
    updateDateLine();


}

function updateRecentTransactions(transactions,currency_unit = 'USD') {
    /*
    Updates the recent transactions list with the latest transactions.  
    Args:
    transactions: An array of transaction objects, each containing amount, description, category, and date.
    currency_unit: The currency unit to display amounts in.
    */ 
    recentTransactionHistory.innerHTML = '';
    transactions=transactions.slice(transactions.length-9,transactions.length); // Show only the last 9 most recent transactions
    transactions.forEach(transaction => {
        // console.log(transaction);
        let category = capitalize(transaction.category);
        recentTransactionHistory.insertAdjacentHTML('beforeend', `
            <li>
                <div class="tx-icon" style="background:${colorMap[transaction.category]?.bg || colorMap['other'].bg};color:${colorMap[transaction.category]?.color || colorMap['other'].color}">${category.charAt(0)}</div>
                <div class="tx-info">
                    <div class="tx-cat">${category}</div>
                    <div class="tx-desc">${transaction.description} · ${new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
                ${category == 'Salary'? `<div class="tx-amt income">+${priceFormatter(transaction.amount)}</div>`: `<div class="tx-amt">-${priceFormatter(transaction.amount)}</div>`}    
            </li>`
        );

    });
}



document.addEventListener("DOMContentLoaded", () => {
    const data = {
    "currency_unit": "USD",
    "month": "2026-05",
    "next_bill_date": "01",
    "last_logged_income_date": "2026-05-01",

    "summary": {
        "total_balance": 12847.50,
        "total_balance_percentage_change": 4.2,
        "total_income": 3000.00,
        "spent_amount": 1247.50,
        "remaining_budget": 1752.50
    },

    "category": [
        { "name": "rent",          "percentage": 72.14 },
        { "name": "food",          "percentage": 11.66 },
        { "name": "transport",     "percentage":  6.81 },
        { "name": "utilities",     "percentage":  4.97 },
        { "name": "subscriptions", "percentage":  2.81 },
        { "name": "entertainment", "percentage":  1.60 }
    ],

    "transaction_history": [
        {
            "amount": 3000.00,
            "description": "May Salary",
            "category": "salary",
            "date": "2026-05-01"
        },
        {
            "amount": 900.00,
            "description": "May Rent",
            "category": "rent",
            "date": "2026-05-01"
        },
        {
            "amount": 62.00,
            "description": "Electricity bill",
            "category": "utilities",
            "date": "2026-05-02"
        },
        {
            "amount": 15.99,
            "description": "Netflix",
            "category": "subscriptions",
            "date": "2026-05-03"
        },
        {
            "amount": 45.50,
            "description": "Walmart groceries",
            "category": "food",
            "date": "2026-05-04"
        },
        {
            "amount": 25.00,
            "description": "Uber to office",
            "category": "transport",
            "date": "2026-05-05"
        },
        {
            "amount": 19.01,
            "description": "Spotify",
            "category": "subscriptions",
            "date": "2026-05-06"
        },
        {
            "amount": 60.00,
            "description": "Restaurant dinner",
            "category": "food",
            "date": "2026-05-08"
        },
        {
            "amount": 20.00,
            "description": "Movie night",
            "category": "entertainment",
            "date": "2026-05-10"
        },
        {
            "amount": 40.00,
            "description": "Lunch with friends",
            "category": "food",
            "date": "2026-05-12"
        },
        {
            "amount": 60.00,
            "description": "Bus pass",
            "category": "transport",
            "date": "2026-05-15"
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
    "other":         { "color": '#94A3B8', "bg": '#F1F5F9' }
};

    currency_unit = data.currency_unit || 'USD';
    updateDashboard(data);
    
});