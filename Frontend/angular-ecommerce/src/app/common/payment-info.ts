export class PaymentInfo {
  [x: string]: any;
  constructor(
    public amount?: number,
    public currency?: string,
    public receiptEmail?: string
  ) {}
}
