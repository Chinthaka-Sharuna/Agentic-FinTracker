-- =====================
-- SALARY TEST DATA
-- =====================
INSERT INTO salary (amount, month, year) VALUES
(150000.00, '01', 2024),
(150000.00, '02', 2024),
(155000.00, '03', 2024),
(155000.00, '04', 2024),
(155000.00, '05', 2024),
(160000.00, '06', 2024),
(160000.00, '07', 2024),
(160000.00, '08', 2024),
(165000.00, '09', 2024),
(165000.00, '10', 2024),
(165000.00, '11', 2024),
(170000.00, '12', 2024),
(170000.00, '01', 2025),
(170000.00, '02', 2025),
(175000.00, '03', 2025);

-- =====================
-- EXPENSES TEST DATA
-- =====================
INSERT INTO expenses (amount, category, description, date) VALUES
-- January 2024
(12000.00, 'Rent',          'Monthly house rent',           '2024-01-01'),
(3500.00,  'Groceries',     'Supermarket weekly shop',      '2024-01-05'),
(1200.00,  'Transport',     'Bus pass & Uber rides',        '2024-01-07'),
(4500.00,  'Dining',        'Restaurant & takeaways',       '2024-01-14'),
(2800.00,  'Utilities',     'Electricity & water bills',    '2024-01-15'),
(6000.00,  'Shopping',      'Clothes & accessories',        '2024-01-20'),
(1500.00,  'Entertainment', 'Netflix, Spotify, movies',     '2024-01-25'),

-- February 2024
(12000.00, 'Rent',          'Monthly house rent',           '2024-02-01'),
(3200.00,  'Groceries',     'Supermarket & fresh market',   '2024-02-03'),
(950.00,   'Transport',     'Fuel & parking',               '2024-02-10'),
(5500.00,  'Healthcare',    'Doctor visit & medicines',     '2024-02-12'),
(2800.00,  'Utilities',     'Electricity & internet',       '2024-02-15'),
(3200.00,  'Dining',        'Valentines dinner & lunches',  '2024-02-14'),
(7500.00,  'Shopping',      'Laptop accessories',           '2024-02-22'),

-- March 2024
(12000.00, 'Rent',          'Monthly house rent',           '2024-03-01'),
(4100.00,  'Groceries',     'Monthly groceries',            '2024-03-04'),
(1800.00,  'Transport',     'Train tickets & Uber',         '2024-03-09'),
(2800.00,  'Utilities',     'Electricity, water & gas',     '2024-03-15'),
(3800.00,  'Dining',        'Team lunch & dinners',         '2024-03-18'),
(15000.00, 'Travel',        'Weekend trip expenses',        '2024-03-23'),
(2200.00,  'Entertainment', 'Concert tickets',              '2024-03-29'),

-- June 2024
(12000.00, 'Rent',          'Monthly house rent',           '2024-06-01'),
(3700.00,  'Groceries',     'Supermarket runs',             '2024-06-06'),
(1100.00,  'Transport',     'Fuel & toll fees',             '2024-06-11'),
(2900.00,  'Utilities',     'Electricity & water',          '2024-06-15'),
(25000.00, 'Travel',        'Holiday flight & hotel',       '2024-06-20'),
(8500.00,  'Shopping',      'Mid-year sale purchases',      '2024-06-25'),

-- September 2024
(12000.00, 'Rent',          'Monthly house rent',           '2024-09-01'),
(3900.00,  'Groceries',     'Monthly groceries',            '2024-09-03'),
(1300.00,  'Transport',     'Bus pass & fuel',              '2024-09-08'),
(2800.00,  'Utilities',     'Electricity & internet',       '2024-09-15'),
(4200.00,  'Healthcare',    'Dental checkup & medicines',   '2024-09-17'),
(6500.00,  'Education',     'Online course subscription',   '2024-09-20'),
(2100.00,  'Dining',        'Friends dinner & cafe',        '2024-09-27'),

-- December 2024
(12000.00, 'Rent',          'Monthly house rent',           '2024-12-01'),
(5500.00,  'Groceries',     'Holiday season shopping',      '2024-12-05'),
(1400.00,  'Transport',     'Uber & fuel',                  '2024-12-10'),
(2800.00,  'Utilities',     'Electricity, water & gas',     '2024-12-15'),
(18000.00, 'Shopping',      'Christmas gifts & decorations','2024-12-18'),
(7500.00,  'Dining',        'Christmas & NYE dinners',      '2024-12-25'),
(3500.00,  'Entertainment', 'Events & streaming services',  '2024-12-30'),

-- January 2025
(12000.00, 'Rent',          'Monthly house rent',           '2025-01-01'),
(3600.00,  'Groceries',     'New year groceries',           '2025-01-04'),
(1200.00,  'Transport',     'Bus pass & Uber',              '2025-01-08'),
(2800.00,  'Utilities',     'Electricity & water',          '2025-01-15'),
(4800.00,  'Shopping',      'New year essentials',          '2025-01-19'),
(2300.00,  'Dining',        'Lunches & dinners out',        '2025-01-24'),

-- February 2025
(12000.00, 'Rent',          'Monthly house rent',           '2025-02-01'),
(3400.00,  'Groceries',     'Supermarket & market',         '2025-02-05'),
(1100.00,  'Transport',     'Fuel & parking',               '2025-02-10'),
(2800.00,  'Utilities',     'Electricity & internet',       '2025-02-15'),
(5500.00,  'Healthcare',    'Annual health checkup',        '2025-02-18'),
(3100.00,  'Dining',        'Valentines & casual dining',   '2025-02-14'),

-- March 2025
(12000.00, 'Rent',          'Monthly house rent',           '2025-03-01'),
(3800.00,  'Groceries',     'Monthly groceries',            '2025-03-03'),
(1500.00,  'Transport',     'Train & Uber rides',           '2025-03-09'),
(2800.00,  'Utilities',     'Electricity, water & gas',     '2025-03-15'),
(9000.00,  'Education',     'Professional certification',   '2025-03-17'),
(4100.00,  'Dining',        'Team outings & lunches',       '2025-03-22'),
(2500.00,  'Entertainment', 'Events & subscriptions',       '2025-03-28');