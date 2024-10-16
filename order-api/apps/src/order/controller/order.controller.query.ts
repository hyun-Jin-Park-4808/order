import { Controller, Get, Param, Query } from '@nestjs/common';
import { OrderQueryService } from '../service/order.service.query';
import { OrderOutput, OrdersOutput } from '../dto/order.output.dto';
import { GetOrdersInput } from '../dto/get-orders.input.dto';
import { HttpOkResponse } from '@app/common/utils/common-http-response';
import { createPagableResponse } from '@app/common/utils/http-response/create-pagable-response';
import { ApiOperation } from '@nestjs/swagger';
import { EmailInput } from '../../member/dto/email.input.dto';

@Controller()
export class OrderQueryController {
    constructor(
        private readonly orderService: OrderQueryService
    ) {}

    @ApiOperation({ summary: '주문 내역 상세 조회하기' })
    @Get(':id')
    async getOrder(
        @Param('id') id: number,
        @Query() email: EmailInput): Promise<OrderOutput> {
        const result = await this.orderService.getOrder(email, id);
        return HttpOkResponse(result);
    }

    @ApiOperation({ summary: '주문 내역 조회하기' })
    @Get()
    async getOrders(
        @Query() inputs: GetOrdersInput): Promise<OrdersOutput> {
        const result = await this.orderService.getOrders(inputs);
        return HttpOkResponse({
            content: result[0],
            pagable: createPagableResponse(inputs.pageSize, inputs.pageNumber, result[1])
        });
    }
}
