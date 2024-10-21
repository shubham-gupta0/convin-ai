const { validateExpenseInput } = require('../controllers/expenseController');

test('Percentage should sum to 100%', () => {
    const result = validateExpenseInput('percentage', [], [40, 30, 30]);
    expect(result.valid).toBe(true);
});

test('Invalid percentage split', () => {
    const result = validateExpenseInput('percentage', [], [40, 30, 20]);
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Percentages must sum to 100%');
});
