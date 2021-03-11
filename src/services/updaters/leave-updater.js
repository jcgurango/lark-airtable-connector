
/**
 * @param {import('../lark-admin')} larkAdmin 
 */
module.exports = (larkAdmin) => {
  return {
    updateLeaves: async (leaves = []) => await Promise.all(
      leaves.map(async ({ userId, defId, balance }) => {
        // Retrieve and parse their current balance.
        const balanceLog = await larkAdmin.leaves.getBalanceLog(defId, userId);
        const currentBalance = parseFloat(balanceLog.quota);
        const targetBalance = parseFloat(balance);

        // Check if their balance is correct in Lark.
        if (currentBalance !== targetBalance) {
          // Update their balance.
          await larkAdmin.leaves.updateBalance(defId, userId, targetBalance - currentBalance, 'Adjustment from AirTable');

          console.log('Updated', defId, 'for', userId, 'from', currentBalance, 'to', targetBalance);
        }
      })
    ),
  };
};
