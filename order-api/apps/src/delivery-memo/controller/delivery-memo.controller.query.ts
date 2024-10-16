import { Controller, Get, Query } from '@nestjs/common';
import { DeliveryMemoQueryService } from '../service/delivery-memo.service.query';
import { ApiOperation } from '@nestjs/swagger';
import { HttpOkResponse } from '@app/common/utils/common-http-response';
import { DeliveryMemosOutput } from '../dto/delivery-memo.output.dto';
import { createPagableResponse } from '@app/common/utils/http-response/create-pagable-response';
import { GetDeliveryMemosInput } from '../dto/get-delivery-memos.input.dto';
import { EmailInput } from '../../member/dto/email.input.dto';

@Controller('delivery-memos')
export class DeliveryMemoQueryController {
    constructor(
        private readonly deliveryMemoService: DeliveryMemoQueryService
    ) {}

    @ApiOperation({ summary: '배송메모 목록 조회하기' })
    @Get()
    async getDelivieryMemos(
        @Query() inputs: GetDeliveryMemosInput): Promise<DeliveryMemosOutput> {
        const result = await this.deliveryMemoService.getDeliveryMemos(inputs);
        return HttpOkResponse({
            content: result[0],
            pagable: createPagableResponse(inputs.pageSize, inputs.pageNumber, result[1])
        });
    }

    @ApiOperation({ summary: '최근 배송메모 조회하기' })
    @Get('/recent')
    async getRecentDeliveryMemo(
        @Query() email: EmailInput): Promise<DeliveryMemosOutput> {
        const result = await this.deliveryMemoService.getRecentDeliveryMemo(email);
        return HttpOkResponse(result);
    }
}
