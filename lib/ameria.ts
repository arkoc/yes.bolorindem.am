const BASE_URL = "https://services.ameriabank.am/VPOS/api/VPOS";
const PAY_URL  = "https://payments.ameriabank.am/VPOS/Payments/Pay";

function creds() {
  return {
    ClientID: process.env.AMERIA_CLIENT_ID!,
    Username: process.env.AMERIA_USERNAME!,
    Password: process.env.AMERIA_PASSWORD!,
  };
}

export interface InitPaymentResult {
  paymentId: string;
  paymentUrl: string;
}

export async function initPayment(params: {
  orderId: number;
  amount: number;
  description: string;
  backUrl: string;
}): Promise<InitPaymentResult> {
  const res = await fetch(`${BASE_URL}/InitPayment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...creds(),
      OrderID: params.orderId,
      Amount: params.amount,
      Currency: "051", // AMD
      Description: params.description,
      BackURL: params.backUrl,
    }),
  });

  if (!res.ok) throw new Error(`AmeriBank InitPayment HTTP ${res.status}`);
  const data = await res.json();

  if (data.ResponseCode !== 1) {
    throw new Error(data.ResponseMessage ?? `AmeriBank error ${data.ResponseCode}`);
  }

  return {
    paymentId: data.PaymentID,
    paymentUrl: `${PAY_URL}?id=${data.PaymentID}&lang=am`,
  };
}

export interface PaymentDetails {
  orderStatus: number;  // 2 = deposited (success)
  responseCode: string; // "00" = success
  amount: number;
  orderId: string;
  paymentState: string;
}

export async function getPaymentDetails(paymentId: string): Promise<PaymentDetails> {
  const res = await fetch(`${BASE_URL}/GetPaymentDetails`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...creds(), PaymentID: paymentId }),
  });

  if (!res.ok) throw new Error(`AmeriBank GetPaymentDetails HTTP ${res.status}`);
  const data = await res.json();

  return {
    orderStatus: Number(data.OrderStatus),
    responseCode: String(data.ResponseCode ?? ""),
    amount: Number(data.Amount),
    orderId: String(data.OrderID ?? ""),
    paymentState: String(data.PaymentState ?? ""),
  };
}

export function isPaymentSuccessful(details: PaymentDetails): boolean {
  // OrderStatus 2 = payment_deposited (funds settled)
  // OrderStatus 1 = payment_approved (preauth, also acceptable for single-stage)
  return details.orderStatus === 2 || details.orderStatus === 1;
}
