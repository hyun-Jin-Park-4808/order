import { API, APICommonHeaders, APIResponse } from "@app/common/cls/api.cls";
import { PortOnePaymentCancelOutput } from "../payment/dto/portone-payment.cancel.output.dto";
import { PortOnePaymentOutput } from "../payment/dto/portone-payment.output.dto";
import { PortOnePaymentCancelInput } from "../payment/dto/cancel.payment.input.dto";

export class GetPaymentResponse extends APIResponse {
    data: PortOnePaymentOutput;
}

export class GetCancelPaymentResponse extends APIResponse {
    data: PortOnePaymentCancelOutput;
}

export class PortOneAPI extends API {
    constructor(
        commonHeaders: APICommonHeaders,
        logging = true,
    ) {
        super(logging, commonHeaders);
    }

    async getPayment(paymentId: string): Promise<GetPaymentResponse> {
        const response = await this.request({
            url: `${process.env.PORTONE_BASE_URL}/payments/${encodeURIComponent(paymentId)}`,
            method: "get",
            headers: {
                Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
            },
        });
        const result: GetPaymentResponse = {
            ...response,
        };
        return result;
    }

    async cancelPayment(cancelPaymentInput: PortOnePaymentCancelInput, paymentId: string): Promise<GetCancelPaymentResponse> {
        cancelPaymentInput.storeId = process.env.STORE_ID;
        const response = await this.request({
            url: `${process.env.PORTONE_BASE_URL}/payments/${encodeURIComponent(paymentId)}/cancel`,
            method: "post",
            headers: {
                Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
            },
            body: JSON.stringify({
                ...cancelPaymentInput
            })
        });
        const result: GetCancelPaymentResponse = {
            ...response,
        };
        return result;
    }


}