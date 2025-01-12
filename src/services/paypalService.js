// src/services/paypalService.js
export const createOrder = async ({ amount, payeeEmail }) => {
    try {
      const response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, payeeEmail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Create order failed");
      return data.id; // PayPal order ID
    } catch (error) {
      console.error("createOrder error:", error);
      throw error;
    }
  };
  
  export const captureOrder = async (orderId) => {
    try {
      const response = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Capture order failed");
      return data;
    } catch (error) {
      console.error("captureOrder error:", error);
      throw error;
    }
  };
  