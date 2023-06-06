package com.jasony.ecommerce.service;

import com.jasony.ecommerce.dto.PaymentInfo;
import com.jasony.ecommerce.dto.Purchase;
import com.jasony.ecommerce.dto.PurchaseResponse;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;

public interface CheckoutService {

    PurchaseResponse placeOrder(Purchase purchase);

    PaymentIntent createPaymentIntent(PaymentInfo paymentInfo) throws StripeException;
}
