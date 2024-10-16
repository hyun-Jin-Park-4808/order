import { Type } from "class-transformer";
import { PaymentCancellation } from "./portone-payment.cancellation.dto";

export class PortOnePaymentCancelOutput {
    @Type(() => PaymentCancellation)
    cancellation: PaymentCancellation;
}