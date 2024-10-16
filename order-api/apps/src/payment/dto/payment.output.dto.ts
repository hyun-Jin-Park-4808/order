import { CoreOutput } from "@app/common/dto/common/output.dto";
import { Payment } from "../entities/payment.entity";

export class PaymentOutput extends CoreOutput {
    data?: Payment;
}

export class PaymentsOutput extends CoreOutput {
    data?: Payment[];
}