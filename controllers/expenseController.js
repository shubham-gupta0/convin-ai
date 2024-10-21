const { db } = require('../config/firebaseConfig');
const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');

const validateExpenseInput = (splitMethod, participants, amounts) => {
    if (splitMethod === 'percentage') {
        const totalPercentage = amounts.reduce((acc, cur) => acc + cur, 0);
        if (totalPercentage !== 100) {
            return { valid: false, message: 'Percentages must sum to 100%' };
        }
    }

    if (amounts.some(amount => amount <= 0)) {
        return { valid: false, message: 'All amounts must be positive' };
    }

    return { valid: true };
};

// Add Expense
const addExpense = async (req, res) => {
    const { amount, participants, splitMethod, splits } = req.body; // Added splits for exact and percentage

    // Validate input
    if (!amount || !participants || !splitMethod) {
        return res.status(400).json({ error: 'Amount, participants, and split method are required.' });
    }
    // Validate input
    const validation = validateExpenseInput(splitMethod, participants, amounts);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
    }

    try {
        // Fetch UIDs corresponding to the provided emails
        const participantUids = await Promise.all(
            participants.map(async (email) => {
                const userSnapshot = await db.collection('users').where('email', '==', email).get();
                if (!userSnapshot.empty) {
                    return userSnapshot.docs[0].id; // Return the UID of the first match
                }
                return null; // If no user found, return null
            })
        );

        // Filter out any null values (emails not found)
        const validUids = participantUids.filter(uid => uid !== null);

        if (validUids.length === 0) {
            return res.status(404).json({ error: 'No valid users found for the provided emails.' });
        }

        let amountsOwed = {};

        // Calculate amounts owed based on the split method
        if (splitMethod === "equal") {
            const splitAmount = amount / validUids.length;
            validUids.forEach(uid => {
                amountsOwed[uid] = splitAmount;
            });
        } else if (splitMethod === "exact" && splits) {
            // splits should be an object with UID as key and amount as value
            validUids.forEach(uid => {
                if (splits[uid] !== undefined) {
                    amountsOwed[uid] = splits[uid];
                }
            });
        } else if (splitMethod === "percentage" && splits) {
            let totalPercentage = Object.values(splits).reduce((a, b) => a + b, 0);
            if (totalPercentage !== 100) {
                return res.status(400).json({ error: 'Percentages must add up to 100.' });
            }

            validUids.forEach(uid => {
                if (splits[uid] !== undefined) {
                    amountsOwed[uid] = (amount * (splits[uid] / 100));
                }
            });
        } else {
            return res.status(400).json({ error: 'Invalid split method or splits data.' });
        }

        const expenseData = {
            amount,
            participants: validUids, // Store UIDs in the expense
            splitMethod,
            amountsOwed, // Store the amounts owed
            createdAt: new Date().toISOString(),
        };

        // Store the expense in Firestore
        const expenseRef = await db.collection('expenses').add(expenseData);
        res.status(201).json({ id: expenseRef.id, ...expenseData });
    } catch (error) {
        res.status(500).json({ error: 'Error adding expense.' });
    }
};


// Retrieve Individual User Expenses
const getUserExpenses = async (req, res) => {
    const { email } = req.params;
    const { page = 1, limit = 10 } = req.query;

    try {
        const expensesSnapshot = await db.collection('expenses')
            .where('participants', 'array-contains', email)
            .offset((page - 1) * limit)
            .limit(parseInt(limit))
            .get();

        const expenses = [];
        expensesSnapshot.forEach(doc => expenses.push({ id: doc.id, ...doc.data() }));

        res.status(200).json({ page, limit, expenses });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching expenses' });
    }
};


// Retrieve Overall Expenses
const getOverallExpenses = async (req, res) => {
    try {
        const expensesSnapshot = await db.collection('expenses').get();

        const expenses = expensesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: 'Error retrieving overall expenses.' });
    }
};

// Generate Balance Sheet
const generateBalanceSheet = async (req, res) => {
    const { uid } = req.params;

    try {
        const expensesSnapshot = await db.collection('expenses')
            .where('participants', 'array-contains', uid)
            .get();

        const balanceSheet = {
            totalOwed: 0,
            totalPaid: 0,
            balances: {}
        };

        expensesSnapshot.forEach(doc => {
            const expense = doc.data();
            const amountOwed = expense.amountsOwed[uid] || 0;

            balanceSheet.totalOwed += amountOwed;
            balanceSheet.balances[doc.id] = {
                amount: expense.amount,
                owed: amountOwed,
                splitMethod: expense.splitMethod,
            };
        });

        res.json(balanceSheet);
    } catch (error) {
        res.status(500).json({ error: 'Error generating balance sheet.' });
    }
};


// Generate Downloadable Balance Sheet
const downloadBalanceSheet = async (req, res) => {
    const { uid } = req.params;

    try {
        const expensesSnapshot = await db.collection('expenses')
            .where('participants', 'array-contains', uid)
            .get();

        const balanceSheet = {
            totalOwed: 0,
            totalPaid: 0,
            balances: []
        };

        expensesSnapshot.forEach(doc => {
            const expense = doc.data();
            const amountOwed = expense.amountsOwed[uid] || 0;

            balanceSheet.totalOwed += amountOwed;
            balanceSheet.balances.push({
                expenseId: doc.id,
                amount: expense.amount,
                owed: amountOwed,
                splitMethod: expense.splitMethod,
            });
        });

        // Create CSV file
        const csvWriter = createCsvWriter({
            path: path.join(__dirname, `../output/balance_sheet_${uid}.csv`),
            header: [
                { id: 'expenseId', title: 'Expense ID' },
                { id: 'amount', title: 'Total Amount' },
                { id: 'owed', title: 'Owed Amount' },
                { id: 'splitMethod', title: 'Split Method' },
            ]
        });

        await csvWriter.writeRecords(balanceSheet.balances);

        // Send CSV file as response
        const filePath = path.join(__dirname, `../output/balance_sheet_${uid}.csv`);
        res.download(filePath, `balance_sheet_${uid}.csv`, (err) => {
            if (err) {
                res.status(500).json({ error: 'Error generating balance sheet file.' });
            }
            fs.unlinkSync(filePath); // Delete the file after download
        });

    } catch (error) {
        res.status(500).json({ error: 'Error generating balance sheet.' });
    }
};


// Generate Downloadable Balance Sheet as PDF
const downloadBalanceSheetAsPDF = async (req, res) => {
    const { uid } = req.params;

    try {
        const expensesSnapshot = await db.collection('expenses')
            .where('participants', 'array-contains', uid)
            .get();

        const balanceSheet = {
            totalOwed: 0,
            totalPaid: 0,
            balances: []
        };

        expensesSnapshot.forEach(doc => {
            const expense = doc.data();
            const amountOwed = expense.amountsOwed[uid] || 0;

            balanceSheet.totalOwed += amountOwed;
            balanceSheet.balances.push({
                expenseId: doc.id,
                amount: expense.amount,
                owed: amountOwed,
                splitMethod: expense.splitMethod,
            });
        });

        // Create PDF
        const doc = new PDFDocument();
        const pdfPath = path.join(__dirname, `../output/balance_sheet_${uid}.pdf`);
        doc.pipe(fs.createWriteStream(pdfPath));

        // Add Title
        doc.fontSize(20).text('Balance Sheet', { align: 'center' });

        // Add Balance Details
        balanceSheet.balances.forEach(balance => {
            doc.fontSize(12).text(`Expense ID: ${balance.expenseId}`);
            doc.text(`Amount: ${balance.amount}`);
            doc.text(`Owed: ${balance.owed}`);
            doc.text(`Split Method: ${balance.splitMethod}`);
            doc.moveDown();
        });

        doc.end();

        // Send PDF file as response
        res.download(pdfPath, `balance_sheet_${uid}.pdf`, (err) => {
            if (err) {
                res.status(500).json({ error: 'Error generating balance sheet PDF.' });
            }
            fs.unlinkSync(pdfPath); // Delete the file after download
        });

    } catch (error) {
        res.status(500).json({ error: 'Error generating balance sheet PDF.' });
    }
};


module.exports = {validateExpenseInput, addExpense, getUserExpenses, getOverallExpenses, generateBalanceSheet, downloadBalanceSheet, downloadBalanceSheetAsPDF};