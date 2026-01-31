const User = require('../models/User');


exports.adminUpdateWallet = async (req, res) => {
    const { userId, amount, reason, type } = req.body; 
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const numAmount = Number(amount);
        if (type === 'CREDIT') {
            user.walletBalance += numAmount;
        } else {
            if (user.walletBalance < numAmount) return res.status(400).json({ error: "Insufficient balance" });
            user.walletBalance -= numAmount;
        }

        user.walletTransactions.unshift({ 
            amount: numAmount, type, reason: reason || "Manual Update", date: new Date() 
        });

        await user.save();
        res.json({ success: true, newBalance: user.walletBalance, transactions: user.walletTransactions });
    } catch (err) { res.status(500).json({ error: "Wallet update failed" }); }
};

exports.refundToWallet = async (req, res) => {
    const { userId, orderId, refundAmount } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        user.walletBalance += Number(refundAmount);
        user.walletTransactions.unshift({ 
            amount: refundAmount, type: 'CREDIT', reason: `Refund for Order: ${orderId}`, date: new Date() 
        });
        await user.save();
        res.json({ success: true, message: "Refund credited", balance: user.walletBalance });
    } catch (err) { res.status(500).json({ error: "Refund failed" }); }
};


exports.getWalletStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('walletBalance walletTransactions');
    if (!user) return res.status(404).json({ message: "User not found" });
    
    res.json({
      balance: user.walletBalance || 0,
      transactions: user.walletTransactions || []
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};