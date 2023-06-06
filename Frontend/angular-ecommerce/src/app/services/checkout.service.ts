import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Purchase } from '../common/purchase';
import { environment } from 'src/environments/environment';
import { PaymentInfo } from '../common/payment-info';

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private purchaseUrl = environment.EcommerceAppUrl + '/checkout/purchase';

  private paymentIntentUrl =
    environment.EcommerceAppUrl + '/checkout/payment-intent';

  constructor(private httpClient: HttpClient) {}

  placeOrder(order: { purchase: Purchase; paymentInfo: PaymentInfo }): Observable<any> {
    return this.httpClient.post<Purchase>(this.purchaseUrl, order);
  }

  createPaymentIntent(paymentInfo: PaymentInfo): Observable<any> {
    return this.httpClient.post<PaymentInfo>(
      this.paymentIntentUrl,
      paymentInfo
    );
  }
}
