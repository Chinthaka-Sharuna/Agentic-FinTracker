-- ============================================================
-- Finance Tracker - Seed / Test Data
-- ============================================================
-- 2 users, 5 months of income + expenses (March–July 2026)
-- July data goes up to today (2026-07-05)
-- Passwords are werkzeug hashes of "password123"
-- Run AFTER tables_schema.sql:
--   sqlite3 data/finance_tracker.db < tables_schema.sql
--   sqlite3 data/finance_tracker.db < seed_data.sql
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- USERS
-- ============================================================
INSERT INTO users (id, username, email, password_hash) VALUES
(1, 'alice', 'alice@example.com', 'scrypt:32768:8:1$Ldd6t9QwCFMLfnG2$7c8ce86d0693a4d28c5596c5bc11a50924286afdcf50da8516bd1ed29a7d6e133fed6fcef2b4e8b6bc32862752d3f328156a1a734efb5dc07dd5c88864692859'),
(2, 'bob',   'bob@example.com',   'scrypt:32768:8:1$YU8TrHjeq2WOawcB$ccc3cff44440adc6fde73e3d688868d9d11937a4a1d638f4506b349b4cfcca69d561ad3662be2afc566754448f5b23f7184d2c791d861a38ac0ab313260ba460');


-- ============================================================
-- INCOME
-- ============================================================

-- Alice
INSERT INTO income (user_id, amount, description, date) VALUES
(1, 3500.00, 'Monthly Salary',        '2026-03-28'),
(1,  450.00, 'Freelance - Web Design','2026-03-15'),
(1, 3500.00, 'Monthly Salary',        '2026-04-28'),
(1,  200.00, 'Freelance - Logo',      '2026-04-10'),
(1, 3500.00, 'Monthly Salary',        '2026-05-28'),
(1,  750.00, 'Freelance - Mobile UI', '2026-05-20'),
(1, 3500.00, 'Monthly Salary',        '2026-06-28'),
(1,  400.00, 'Freelance - Branding',  '2026-06-15'),
(1, 3500.00, 'Monthly Salary',        '2026-07-01'),
(1,  300.00, 'Freelance - Icon Set',  '2026-07-03');

-- Bob
INSERT INTO income (user_id, amount, description, date) VALUES
(2, 5200.00, 'Monthly Salary',    '2026-03-28'),
(2, 5200.00, 'Monthly Salary',    '2026-04-28'),
(2, 1000.00, 'Performance Bonus', '2026-04-30'),
(2, 5200.00, 'Monthly Salary',    '2026-05-28'),
(2, 5200.00, 'Monthly Salary',    '2026-06-28'),
(2,  500.00, 'Consulting Fee',    '2026-06-20'),
(2, 5200.00, 'Monthly Salary',    '2026-07-01');


-- ============================================================
-- EXPENSES — Alice (user_id = 1)
-- ============================================================

-- ── March 2026 ──
INSERT INTO expenses (user_id, amount, category, description, date) VALUES
(1,  950.00, 'rent',          'Monthly Rent - March',        '2026-03-01'),
(1,   85.50, 'utilities',     'Electricity Bill',            '2026-03-03'),
(1,   42.00, 'utilities',     'Internet - March',            '2026-03-04'),
(1,  120.00, 'food',          'Supermarket Weekly Shop',     '2026-03-07'),
(1,   18.50, 'food',          'Coffee Shop',                 '2026-03-08'),
(1,   55.00, 'transport',     'Monthly Bus Pass',            '2026-03-10'),
(1,   65.00, 'healthcare',    'Pharmacy - Prescriptions',    '2026-03-12'),
(1,   89.99, 'shopping',      'Clothing - H&M',              '2026-03-14'),
(1,  110.00, 'food',          'Supermarket Weekly Shop',     '2026-03-15'),
(1,   14.99, 'subscriptions', 'Netflix',                     '2026-03-17'),
(1,   12.99, 'subscriptions', 'Spotify',                     '2026-03-17'),
(1,   35.00, 'entertainment', 'Cinema Tickets x2',           '2026-03-20'),
(1,   98.00, 'food',          'Supermarket Weekly Shop',     '2026-03-22'),
(1,   22.00, 'food',          'Restaurant Lunch',            '2026-03-25'),
(1,   45.00, 'education',     'Online Course - Udemy',       '2026-03-27'),
(1,  105.00, 'food',          'Supermarket Weekly Shop',     '2026-03-29');

-- ── April 2026 ──
INSERT INTO expenses (user_id, amount, category, description, date) VALUES
(1,  950.00, 'rent',          'Monthly Rent - April',        '2026-04-01'),
(1,   78.20, 'utilities',     'Electricity Bill',            '2026-04-03'),
(1,   42.00, 'utilities',     'Internet - April',            '2026-04-04'),
(1,  132.00, 'food',          'Supermarket Weekly Shop',     '2026-04-06'),
(1,   22.50, 'food',          'Coffee Shop',                 '2026-04-09'),
(1,   55.00, 'transport',     'Monthly Bus Pass',            '2026-04-10'),
(1,   48.00, 'healthcare',    'Dentist Checkup',             '2026-04-11'),
(1,  115.00, 'food',          'Supermarket Weekly Shop',     '2026-04-13'),
(1,   14.99, 'subscriptions', 'Netflix',                     '2026-04-17'),
(1,   12.99, 'subscriptions', 'Spotify',                     '2026-04-17'),
(1,   75.00, 'shopping',      'Shoes - Zara',                '2026-04-19'),
(1,   28.00, 'entertainment', 'Concert Ticket',              '2026-04-21'),
(1,  102.00, 'food',          'Supermarket Weekly Shop',     '2026-04-20'),
(1,   38.00, 'food',          'Restaurant Dinner',           '2026-04-24'),
(1,  108.00, 'food',          'Supermarket Weekly Shop',     '2026-04-27'),
(1,   60.00, 'fuel',          'Petrol Station',              '2026-04-29');

-- ── May 2026 ──
INSERT INTO expenses (user_id, amount, category, description, date) VALUES
(1,  950.00, 'rent',          'Monthly Rent - May',          '2026-05-01'),
(1,   81.40, 'utilities',     'Electricity Bill',            '2026-05-02'),
(1,   42.00, 'utilities',     'Internet - May',              '2026-05-04'),
(1,  125.00, 'food',          'Supermarket Weekly Shop',     '2026-05-05'),
(1,   16.00, 'food',          'Coffee Shop',                 '2026-05-07'),
(1,   55.00, 'transport',     'Monthly Bus Pass',            '2026-05-10'),
(1,  118.00, 'food',          'Supermarket Weekly Shop',     '2026-05-12'),
(1,   14.99, 'subscriptions', 'Netflix',                     '2026-05-17'),
(1,   12.99, 'subscriptions', 'Spotify',                     '2026-05-17'),
(1,  149.99, 'shopping',      'Headphones - Amazon',         '2026-05-18'),
(1,   52.00, 'entertainment', 'Theatre Tickets',             '2026-05-20'),
(1,  109.00, 'food',          'Supermarket Weekly Shop',     '2026-05-19'),
(1,   45.00, 'healthcare',    'Optician - Eye Test',         '2026-05-22'),
(1,   33.00, 'food',          'Birthday Dinner Out',         '2026-05-24'),
(1,   99.00, 'education',     'Book Bundle - Programming',   '2026-05-26'),
(1,  103.00, 'food',          'Supermarket Weekly Shop',     '2026-05-26'),
(1,   65.00, 'fuel',          'Petrol Station',              '2026-05-28');

-- ── June 2026 ──
INSERT INTO expenses (user_id, amount, category, description, date) VALUES
(1,  950.00, 'rent',          'Monthly Rent - June',         '2026-06-01'),
(1,   80.00, 'utilities',     'Electricity Bill',            '2026-06-02'),
(1,   42.00, 'utilities',     'Internet - June',             '2026-06-04'),
(1,  122.00, 'food',          'Supermarket Weekly Shop',     '2026-06-06'),
(1,   19.00, 'food',          'Coffee Shop',                 '2026-06-08'),
(1,   55.00, 'transport',     'Monthly Bus Pass',            '2026-06-10'),
(1,  114.00, 'food',          'Supermarket Weekly Shop',     '2026-06-13'),
(1,   14.99, 'subscriptions', 'Netflix',                     '2026-06-17'),
(1,   12.99, 'subscriptions', 'Spotify',                     '2026-06-17'),
(1,   88.00, 'shopping',      'Summer Clothes',              '2026-06-19'),
(1,   40.00, 'entertainment', 'Board Game Night',            '2026-06-21'),
(1,  108.00, 'food',          'Supermarket Weekly Shop',     '2026-06-20'),
(1,   55.00, 'healthcare',    'GP Visit',                    '2026-06-23'),
(1,   30.00, 'food',          'Takeaway',                    '2026-06-25'),
(1,  104.00, 'food',          'Supermarket Weekly Shop',     '2026-06-27'),
(1,   58.00, 'fuel',          'Petrol Station',              '2026-06-29');

-- ── July 2026 (up to today Jul 5) ──
INSERT INTO expenses (user_id, amount, category, description, date) VALUES
(1,  950.00, 'rent',          'Monthly Rent - July',         '2026-07-01'),
(1,   42.00, 'utilities',     'Internet - July',             '2026-07-02'),
(1,  118.00, 'food',          'Supermarket Weekly Shop',     '2026-07-03'),
(1,   55.00, 'transport',     'Monthly Bus Pass',            '2026-07-03'),
(1,   14.99, 'subscriptions', 'Netflix',                     '2026-07-04'),
(1,   12.99, 'subscriptions', 'Spotify',                     '2026-07-04'),
(1,   22.50, 'food',          'Coffee Shop',                 '2026-07-05');


-- ============================================================
-- EXPENSES — Bob (user_id = 2)
-- ============================================================

-- ── March 2026 ──
INSERT INTO expenses (user_id, amount, category, description, date) VALUES
(2, 1400.00, 'rent',          'Monthly Rent - March',        '2026-03-01'),
(2,  110.00, 'utilities',     'Electricity & Gas',           '2026-03-02'),
(2,   55.00, 'utilities',     'Internet - March',            '2026-03-04'),
(2,  180.00, 'food',          'Supermarket Weekly Shop',     '2026-03-06'),
(2,   35.00, 'food',          'Coffee & Lunch Out',          '2026-03-10'),
(2,  120.00, 'transport',     'Monthly Train Pass',          '2026-03-11'),
(2,  200.00, 'healthcare',    'Private GP Consultation',     '2026-03-13'),
(2,  165.00, 'food',          'Supermarket Weekly Shop',     '2026-03-14'),
(2,   17.99, 'subscriptions', 'Netflix Premium',             '2026-03-17'),
(2,   14.99, 'subscriptions', 'Spotify Family',              '2026-03-17'),
(2,   29.99, 'subscriptions', 'Adobe Creative Cloud',        '2026-03-17'),
(2,  320.00, 'shopping',      'Laptop Stand & Accessories',  '2026-03-19'),
(2,  155.00, 'food',          'Supermarket Weekly Shop',     '2026-03-21'),
(2,   85.00, 'entertainment', 'Sports Event Tickets',        '2026-03-23'),
(2,  160.00, 'food',          'Supermarket Weekly Shop',     '2026-03-28'),
(2,   90.00, 'fuel',          'Petrol - Full Tank',          '2026-03-30');

-- ── April 2026 ──
INSERT INTO expenses (user_id, amount, category, description, date) VALUES
(2, 1400.00, 'rent',          'Monthly Rent - April',        '2026-04-01'),
(2,   98.00, 'utilities',     'Electricity & Gas',           '2026-04-02'),
(2,   55.00, 'utilities',     'Internet - April',            '2026-04-04'),
(2,  172.00, 'food',          'Supermarket Weekly Shop',     '2026-04-05'),
(2,   45.00, 'food',          'Team Lunch',                  '2026-04-09'),
(2,  120.00, 'transport',     'Monthly Train Pass',          '2026-04-10'),
(2,  158.00, 'food',          'Supermarket Weekly Shop',     '2026-04-12'),
(2,   17.99, 'subscriptions', 'Netflix Premium',             '2026-04-17'),
(2,   14.99, 'subscriptions', 'Spotify Family',              '2026-04-17'),
(2,   29.99, 'subscriptions', 'Adobe Creative Cloud',        '2026-04-17'),
(2,  450.00, 'shopping',      'New Monitor - Dell',          '2026-04-18'),
(2,   65.00, 'entertainment', 'Anniversary Dinner',          '2026-04-20'),
(2,  162.00, 'food',          'Supermarket Weekly Shop',     '2026-04-20'),
(2,  175.00, 'healthcare',    'Physio Sessions x2',          '2026-04-22'),
(2,  168.00, 'food',          'Supermarket Weekly Shop',     '2026-04-27'),
(2,   88.00, 'fuel',          'Petrol - Full Tank',          '2026-04-29');

-- ── May 2026 ──
INSERT INTO expenses (user_id, amount, category, description, date) VALUES
(2, 1400.00, 'rent',          'Monthly Rent - May',          '2026-05-01'),
(2,  105.00, 'utilities',     'Electricity & Gas',           '2026-05-02'),
(2,   55.00, 'utilities',     'Internet - May',              '2026-05-04'),
(2,  178.00, 'food',          'Supermarket Weekly Shop',     '2026-05-05'),
(2,   38.00, 'food',          'Coffee & Snacks',             '2026-05-08'),
(2,  120.00, 'transport',     'Monthly Train Pass',          '2026-05-10'),
(2,  164.00, 'food',          'Supermarket Weekly Shop',     '2026-05-11'),
(2,   17.99, 'subscriptions', 'Netflix Premium',             '2026-05-17'),
(2,   14.99, 'subscriptions', 'Spotify Family',              '2026-05-17'),
(2,   29.99, 'subscriptions', 'Adobe Creative Cloud',        '2026-05-17'),
(2,  280.00, 'shopping',      'Running Shoes - Nike',        '2026-05-19'),
(2,  170.00, 'food',          'Supermarket Weekly Shop',     '2026-05-18'),
(2,  120.00, 'entertainment', 'Weekend Trip - Hotel',        '2026-05-21'),
(2,   92.00, 'fuel',          'Petrol - Full Tank',          '2026-05-24'),
(2,  160.00, 'food',          'Supermarket Weekly Shop',     '2026-05-25'),
(2,  200.00, 'education',     'Conference Ticket',           '2026-05-27'),
(2,   75.00, 'healthcare',    'Pharmacy & Supplements',      '2026-05-28');

-- ── June 2026 ──
INSERT INTO expenses (user_id, amount, category, description, date) VALUES
(2, 1400.00, 'rent',          'Monthly Rent - June',         '2026-06-01'),
(2,   95.00, 'utilities',     'Electricity & Gas',           '2026-06-02'),
(2,   55.00, 'utilities',     'Internet - June',             '2026-06-04'),
(2,  175.00, 'food',          'Supermarket Weekly Shop',     '2026-06-05'),
(2,   42.00, 'food',          'Team Lunch',                  '2026-06-09'),
(2,  120.00, 'transport',     'Monthly Train Pass',          '2026-06-10'),
(2,  160.00, 'food',          'Supermarket Weekly Shop',     '2026-06-13'),
(2,   17.99, 'subscriptions', 'Netflix Premium',             '2026-06-17'),
(2,   14.99, 'subscriptions', 'Spotify Family',              '2026-06-17'),
(2,   29.99, 'subscriptions', 'Adobe Creative Cloud',        '2026-06-17'),
(2,  350.00, 'shopping',      'Smartwatch - Samsung',        '2026-06-18'),
(2,   80.00, 'entertainment', 'Football Match Tickets',      '2026-06-21'),
(2,  165.00, 'food',          'Supermarket Weekly Shop',     '2026-06-20'),
(2,  150.00, 'healthcare',    'Dental Checkup',              '2026-06-23'),
(2,  158.00, 'food',          'Supermarket Weekly Shop',     '2026-06-27'),
(2,   95.00, 'fuel',          'Petrol - Full Tank',          '2026-06-29');

-- ── July 2026 (up to today Jul 5) ──
INSERT INTO expenses (user_id, amount, category, description, date) VALUES
(2, 1400.00, 'rent',          'Monthly Rent - July',         '2026-07-01'),
(2,   55.00, 'utilities',     'Internet - July',             '2026-07-02'),
(2,  172.00, 'food',          'Supermarket Weekly Shop',     '2026-07-03'),
(2,  120.00, 'transport',     'Monthly Train Pass',          '2026-07-03'),
(2,   17.99, 'subscriptions', 'Netflix Premium',             '2026-07-04'),
(2,   14.99, 'subscriptions', 'Spotify Family',              '2026-07-04'),
(2,   29.99, 'subscriptions', 'Adobe Creative Cloud',        '2026-07-04'),
(2,   45.00, 'food',          'Team Lunch',                  '2026-07-05');


-- ============================================================
-- CHAT HISTORY
-- ============================================================
INSERT INTO chat_history (user_id, role, content) VALUES
(1, 'user',      'What is my remaining balance for this month?'),
(1, 'assistant', 'This month you have earned $3,800.00 and spent $1,215.48, leaving you with $2,584.52 remaining.'),
(1, 'user',      'Log an expense of $22 for coffee today'),
(1, 'assistant', 'Done! Logged $22.00 for food. Spent: $1,237.48 | Remaining: $2,562.52'),

(2, 'user',      'Give me a summary of my spending this month'),
(2, 'assistant', 'Here is your July summary so far: Rent $1,400 · Food $217 · Transport $120 · Subscriptions $62 · Utilities $55.'),
(2, 'user',      'Which category am I spending the most on?'),
(2, 'assistant', 'Your biggest category this month is Rent at $1,400.00, which is 77% of your total spending so far.');