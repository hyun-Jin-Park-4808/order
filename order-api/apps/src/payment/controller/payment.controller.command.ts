import { HttpOkResponse } from '@app/common/utils/common-http-response';
import { Body, Controller, Post, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { EmailInput } from 'apps/src/member/dto/email.input.dto';
import { PaymentInput } from '../dto/payment.input.dto';
import { PaymentOutput } from '../dto/payment.output.dto';
import { PaymentCommandService } from '../service/payment.service.command';

@Controller('payments')
export class PaymentCommandController {
    constructor(
        private readonly paymentService: PaymentCommandService
    ) { }

    @ApiOperation({ summary: '결제하기' })
    @Post()
    async payment(
        @Query() email: EmailInput,
        @Body() paymentInput: PaymentInput): Promise<PaymentOutput> {
        const result = await this.paymentService.payment(email, paymentInput);
        return HttpOkResponse(result);
    }

    @ApiOperation({ summary: '결제 취소하기 or 환불 진행하기' })
    @Post('/cancel')
    async cancelPayment(
        @Query() email: EmailInput,
        @Body() cancelPaymentInput: any): Promise<PaymentOutput> {
        const result = await this.paymentService.cancelPayment(email, cancelPaymentInput);
        return HttpOkResponse(result);
    }
}