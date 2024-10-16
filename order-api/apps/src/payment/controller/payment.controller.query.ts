import { HttpOkResponse } from '@app/common/utils/common-http-response';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { GetPaymentsInput } from '../dto/get-payments.input.dto';
import { PaymentOutput, PaymentsOutput } from '../dto/payment.output.dto';
import { PaymentQueryService } from '../service/payment.service.query';
import { createPagableResponse } from '@app/common/utils/http-response/create-pagable-response';
import { EmailInput } from '../../member/dto/email.input.dto';
import { EnvironmentDto } from '../dto/environment.dto';

@Controller('payments')
export class PaymentQueryController {
    constructor(
        private readonly paymentService: PaymentQueryService
    ) { }

    @Get('/env')
    async getEnvironment(
        @Query() email: EmailInput): Promise<EnvironmentDto> {
        const result = await this.paymentService.getEnvironment(email);
        return result;
    }

    @ApiOperation({ summary: '결제 내역 조회' })
    @Get('/orders/:id')
    async getPayments(
        @Param('id') id: number,
        @Query() inputs: GetPaymentsInput): Promise<PaymentsOutput> {
        const result = await this.paymentService.getPayments(inputs, id);
        return HttpOkResponse({
            content: result[0], // pageable로 오타 수정 필요해 보임. 
            pagable: createPagableResponse(inputs.pageSize, inputs.pageNumber, result[1])
        });
    }

    @ApiOperation({ summary: '결제 내역 상세 조회' })
    @Get(':id')
    async getPayment(
        @Query() email: EmailInput,
        @Param('id') id: number): Promise<PaymentOutput> {
        const result = await this.paymentService.getPayment(id, email);
        return HttpOkResponse(result);
    }
}
