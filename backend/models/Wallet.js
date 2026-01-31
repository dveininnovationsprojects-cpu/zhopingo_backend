// walletController.js
exports.adminUpdateWallet = async (req, res) => {
    const { userId, amount, reason, type } = req.body; // type = 'CREDIT' or 'DEBIT'
    try {
        const user = await User.findById(userId);
        if (type === 'CREDIT') {
            user.walletBalance += amount;
        } else {
            user.walletBalance -= amount;
        }

      
        user.walletTransactions.push({ amount, type, reason, date: new Date() });
        await user.save();
        
        res.json({ success: true, newBalance: user.walletBalance });
    } catch (err) { res.status(500).json({ error: "Wallet update failed" }); }
};