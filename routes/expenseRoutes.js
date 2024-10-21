const express = require('express');
const { addExpense, getUserExpenses, generateBalanceSheet, downloadBalanceSheet, downloadBalanceSheetAsPDF } = require('../controllers/expenseController');

const router = express.Router();

// Protect routes with the authenticate middleware
router.post('/add', addExpense);
router.get('/:email/expense', getUserExpenses);
router.get('/balance-sheet/:uid', generateBalanceSheet);
router.get('/balance-sheet/download/:uid', downloadBalanceSheet);
router.get('/balance-sheet/download/pdf/:uid', downloadBalanceSheetAsPDF);

module.exports = router;
