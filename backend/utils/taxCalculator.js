// Strictly based on Excel Rule 5
export const calculateBill = (items) => {
  let subTotal = 0;
  let totalTax = 0;

  items.forEach(item => {
    const tax = (item.price * item.gstPercent) / 100;
    subTotal += item.price * item.quantity;
    totalTax += tax * item.quantity;
  });

  return {
    subTotal,
    totalTax,
    grandTotal: subTotal + totalTax
  };
};