import { Controller, Get, Query } from '@nestjs/common';
import { DeliveryQueryService } from '../service/delivery.service.query';
import { ApiOperation } from '@nestjs/swagger';
import { EmailInput } from '../../member/dto/email.input.dto';
import { DeliveriesOutput, DeliveryOutput } from '../dto/delivery.output.dto';
import { HttpOkResponse } from '@app/common/utils/common-http-response';
import { createPagableResponse } from '@app/common/utils/http-response/create-pagable-response';
import { GetDeliveriesInput } from '../dto/get-deliveries.input.dto';

@Controller('deliveries')
export class DeliveryQueryController {
    constructor(
        private readonly deliveryService: DeliveryQueryService
    ) {}

    @ApiOperation({ summary: '기본 배송지 조회하기' })
    @Get('/default')
    async getDefaultDelivery(
        @Query() email: EmailInput): Promise<DeliveryOutput> {
        const result = await this.deliveryService.getDefaultDelivery(email);
        return HttpOkResponse(result);
    }

    @ApiOperation({ summary: '배송지 목록 조회하기' })
    @Get()
    async getDelivieries(
        @Query() inputs: GetDeliveriesInput): Promise<DeliveriesOutput> {
        const result = await this.deliveryService.getDeliveries(inputs);
        return HttpOkResponse({
            content: result[0],
            pagable: createPagableResponse(inputs.pageSize, inputs.pageNumber, result[1])
        });
    }

}
