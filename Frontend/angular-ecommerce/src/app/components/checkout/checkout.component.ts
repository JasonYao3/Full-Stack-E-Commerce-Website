import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Country } from 'src/app/common/country';
import { Order } from 'src/app/common/order';
import { OrderItem } from 'src/app/common/order-item';
import { PaymentInfo } from 'src/app/common/payment-info';
import { Purchase } from 'src/app/common/purchase';
import { State } from 'src/app/common/state';
import { CartService } from 'src/app/services/cart.service';
import { CheckoutService } from 'src/app/services/checkout.service';
import { ShopFormService } from 'src/app/services/shop-form.service';
import { ShopValidators } from 'src/app/validators/shop-validators';
import { environment } from 'src/environments/environment';
import {
  loadStripe,
  Stripe,
  StripeElements,
  StripeElementsOptions,
} from '@stripe/stripe-js';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css'],
})
export class CheckoutComponent implements OnInit {
  checkoutFormGroup!: FormGroup;
  shippingAddressStates: State[] = [];
  billingAddressStates: State[] = [];

  totalPrice: number = 0.0;
  totalQuantity: number = 0;

  creditCardYears: number[] = [];
  creditCardMonths: number[] = [];

  countries: Country[] = [];

  storage: Storage = sessionStorage;

  stripe: Stripe | null = null;
  elements: StripeElements | null = null;

  paymentInfo: PaymentInfo = new PaymentInfo();
  cardElement: any;
  displayError: string = '';
  isDisabled: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private shopFormService: ShopFormService,
    private cartService: CartService,
    private checkoutService: CheckoutService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    let stripeElements = await this.initStripe();
    this.stripe = stripeElements.stripe;
    this.elements = stripeElements.elements;

    // setup Stripe payment form
    this.setupStripePaymentForm();

    this.reviewCartDetails();

    // read the user's email address from browser storage
    const theEmail = JSON.parse(this.storage.getItem('userEmail')!);

    this.checkoutFormGroup = this.formBuilder.group({
      customer: this.formBuilder.group({
        firstName: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            ShopValidators.notOnlyWhitespace,
          ],
        ],
        lastName: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            ShopValidators.notOnlyWhitespace,
          ],
        ],
        email: [
          theEmail,
          [
            Validators.required,
            Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$'),
          ],
        ],
      }),
      shippingAddress: this.formBuilder.group({
        street: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            ShopValidators.notOnlyWhitespace,
          ],
        ],
        city: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            ShopValidators.notOnlyWhitespace,
          ],
        ],
        state: ['', [Validators.required]],
        country: ['', [Validators.required]],
        zipCode: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            ShopValidators.notOnlyWhitespace,
          ],
        ],
      }),
      billingAddress: this.formBuilder.group({
        street: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            ShopValidators.notOnlyWhitespace,
          ],
        ],
        city: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            ShopValidators.notOnlyWhitespace,
          ],
        ],
        state: ['', [Validators.required]],
        country: ['', [Validators.required]],
        zipCode: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            ShopValidators.notOnlyWhitespace,
          ],
        ],
      }),
      creditCard: this.formBuilder.group({
        cardType: ['', [Validators.required]],
        nameOnCard: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            ShopValidators.notOnlyWhitespace,
          ],
        ],
        cardNumber: [
          '',
          [Validators.required, Validators.pattern('[0-9]{16}')],
        ],
        securityCode: [
          '',
          [Validators.required, Validators.pattern('[0-9]{3}')],
        ],
        expirationMonth: ['', [Validators.required]],
        expirationYear: ['', [Validators.required]],
      }),
    });

    // populate credit card months and years
    const startMonth: number = new Date().getMonth() + 1;
    console.log('startMonth: ' + startMonth);

    this.shopFormService.getCreditCardMonths(startMonth).subscribe((data) => {
      console.log('Retrieved credit card months: ' + JSON.stringify(data));
      this.creditCardMonths = data;
    });

    this.shopFormService.getCreditCardYears().subscribe((data) => {
      console.log('Retrieved credit card years: ' + JSON.stringify(data));
      this.creditCardYears = data;
    });

    // populate countries
    this.shopFormService.getCountries().subscribe((data) => {
      console.log('Retrieved countries: ' + JSON.stringify(data));
      this.countries = data;
    });
  }

  async initStripe(): Promise<{
    stripe: Stripe | null;
    elements: StripeElements | null;
  }> {
    const stripe = await loadStripe(environment.stripePublishableKey);
    const elementsOptions: StripeElementsOptions = {
      fonts: [
        {
          cssSrc: 'https://fonts.googleapis.com/css?family=Roboto',
        },
      ],
      locale: 'en',
    };
    const elements = stripe ? stripe.elements() : null;

    return { stripe, elements };
  }

  setupStripePaymentForm(): void {
    const style = {
      base: {
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
      },
    };

    this.cardElement = this.elements!.create('card', { style });
    this.cardElement.mount('#card-element');

    this.cardElement.on('change', (event: any) => {
      if (event.error) {
        this.displayError = event.error.message;
      } else {
        this.displayError = '';
      }
    });
  }

  reviewCartDetails(): void {
    // subscribe to cartService.totalQuantity
    this.cartService.totalQuantity.subscribe(
      (totalQuantity) => (this.totalQuantity = totalQuantity)
    );

    // subscribe to cartService.totalPrice
    this.cartService.totalPrice.subscribe(
      (totalPrice) => (this.totalPrice = totalPrice)
    );
  }

  onSubmit(): void {
    console.log('first name is', this.firstName?.value);
    console.log('last name is', this.lastName?.value);
    console.log('city is', this.shippingAddressCity?.value);

    if (this.checkoutFormGroup.invalid || this.isDisabled) {
      this.checkoutFormGroup.markAllAsTouched();
      return;
    }

    // set up order
    const order: Order = new Order();
    order.totalPrice = this.totalPrice;
    order.totalQuantity = this.totalQuantity;

    // get cart items
    const cartItems = this.cartService.cartItems;

    // create orderItems from cartItems
    let orderItems: OrderItem[] = [];
    for (let i = 0; i < cartItems.length; i++) {
      orderItems[i] = new OrderItem(cartItems[i]);
    }

    // set up purchase
    const purchase: Purchase = new Purchase();
    purchase.customer = this.checkoutFormGroup.controls['customer'].value;

    // populate purchase - shipping address
    purchase.shippingAddress =
      this.checkoutFormGroup.controls['shippingAddress'].value;
    const selectedShippingCountry: Country =
      this.checkoutFormGroup.controls['shippingAddress'].value.country;
    purchase.shippingAddress.country = selectedShippingCountry.name;
    const selectedShippingState: State =
      this.checkoutFormGroup.controls['shippingAddress'].value.state;
    purchase.shippingAddress.state = selectedShippingState.name;

    // populate purchase - billing address
    purchase.billingAddress =
      this.checkoutFormGroup.controls['billingAddress'].value;
    const selectedBillingCountry: Country =
      this.checkoutFormGroup.controls['billingAddress'].value.country;
    purchase.billingAddress.country = selectedBillingCountry.name;
    const selectedBillingState: State =
      this.checkoutFormGroup.controls['billingAddress'].value.state;
    purchase.billingAddress.state = selectedBillingState.name;

    // populate purchase - order and orderItems
    purchase.order = order;
    purchase.orderItems = orderItems;

    // set up payment info
    // set up payment info
    this.paymentInfo['cardNumber'] = this.checkoutFormGroup.get(
      'creditCard.cardNumber'
    )!.value;
    this.paymentInfo['expirationMonth'] = this.checkoutFormGroup.get(
      'creditCard.expirationMonth'
    )!.value;
    this.paymentInfo['expirationYear'] = this.checkoutFormGroup.get(
      'creditCard.expirationYear'
    )!.value;
    this.paymentInfo['securityCode'] = this.checkoutFormGroup.get(
      'creditCard.securityCode'
    )!.value;

    // place order
    this.checkoutService
      .placeOrder({ purchase: purchase, paymentInfo: this.paymentInfo })
      .subscribe({
        next: (response) => {
          alert(
            `Order placed successfully!\nOrder tracking number: ${response.orderTrackingNumber}`
          );
          this.resetCart();
        },
        error: (err) => {
          alert(`There was an error: ${err.message}`);
        },
      });
  }

  resetCart(): void {
    this.cartService.cartItems = [];
    this.cartService.totalPrice.next(0);
    this.cartService.totalQuantity.next(0);
    this.checkoutFormGroup.reset();

    this.router.navigateByUrl('/products');
  }

  copyShippingAddressToBillingAddress(event: any): void {
    if (event.target.checked) {
      this.checkoutFormGroup.controls['billingAddress'].setValue(
        this.checkoutFormGroup.controls['shippingAddress'].value
      );
      this.billingAddressStates = this.shippingAddressStates;
    } else {
      this.checkoutFormGroup.controls['billingAddress'].reset();
      this.billingAddressStates = [];
    }
  }

  get firstName() {
    return this.checkoutFormGroup?.get('customer.firstName');
  }

  get lastName() {
    return this.checkoutFormGroup.get('customer.lastName');
  }

  get email() {
    return this.checkoutFormGroup.get('customer.email');
  }

  get shippingAddressStreet() {
    return this.checkoutFormGroup.get('shippingAddress.street');
  }

  get shippingAddressCity() {
    return this.checkoutFormGroup.get('shippingAddress.city');
  }

  get shippingAddressState() {
    return this.checkoutFormGroup.get('shippingAddress.state');
  }

  get shippingAddressCountry() {
    return this.checkoutFormGroup.get('shippingAddress.country');
  }

  get shippingAddressZipCode() {
    return this.checkoutFormGroup.get('shippingAddress.zipCode');
  }

  get billingAddressStreet() {
    return this.checkoutFormGroup.get('billingAddress.street');
  }

  get billingAddressCity() {
    return this.checkoutFormGroup.get('billingAddress.city');
  }

  get billingAddressState() {
    return this.checkoutFormGroup.get('billingAddress.state');
  }

  get billingAddressCountry() {
    return this.checkoutFormGroup.get('billingAddress.country');
  }

  get billingAddressZipCode() {
    return this.checkoutFormGroup.get('billingAddress.zipCode');
  }

  get creditCardType() {
    return this.checkoutFormGroup.get('creditCard.cardType');
  }

  get creditCardNameOnCard() {
    return this.checkoutFormGroup.get('creditCard.nameOnCard');
  }

  get creditCardNumber() {
    return this.checkoutFormGroup.get('creditCard.cardNumber');
  }

  get creditCardSecurityCode() {
    return this.checkoutFormGroup.get('creditCard.securityCode');
  }

  get creditCardExpirationMonth() {
    return this.checkoutFormGroup.get('creditCard.expirationMonth');
  }

  get creditCardExpirationYear() {
    return this.checkoutFormGroup.get('creditCard.expirationYear');
  }

  getStates(formGroupName: string) {
    const formGroup = this.checkoutFormGroup.get(formGroupName);
    const countryControl = formGroup?.get('country');

    if (formGroup && countryControl) {
      const countryCode = countryControl.value?.code;
      const countryName = countryControl.value?.name;

      console.log(`${formGroupName} country name: ${countryName}`);

      this.shopFormService.getStates(countryCode).subscribe((data) => {
        if (formGroupName === 'shippingAddress') {
          this.shippingAddressStates = data;
        } else {
          this.billingAddressStates = data;
        }

        // select first item by default
        formGroup.get('state')?.setValue(data[0]);
      });
    }
  }
}
