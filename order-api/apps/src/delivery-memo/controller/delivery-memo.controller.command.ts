import { Body, Controller, Delete, Param, Post, Query } from '@nestjs/common';
import { DeliveryMemoCommandService } from '../service/delivery-memo.service.command';
import { ApiOperation } from '@nestjs/swagger';
import { EmailInput } from '../../member/dto/email.input.dto';
import { HttpOkResponse } from '@app/common/utils/common-http-response';
import { DeliveryMemoInput } from '../dto/delivery-memo.input.dto';
import { DeliveryMemoOutput } from '../dto/delivery-memo.output.dto';

@Controller('delivery-memos')
export class DeliveryMemoCommandController {
    constructor(
        private readonly deliveryMemoService: DeliveryMemoCommandService
    ) {}

    @ApiOperation({ summary: '배송메모 저장하기' })
    @Post()
    async saveDeliveryMemo(
        @Query() email: EmailInput,
        @Body() deliveryMemoInput: DeliveryMemoInput): Promise<DeliveryMemoOutput> {
        const result = await this.deliveryMemoService.saveDeliveryMemo(email, deliveryMemoInput);
        return HttpOkResponse(result);
    }


    @ApiOperation({ summary: '배송메모 삭제하기' })
    @Delete(':id')
    async deleteDeliveryMemo(
        @Param('id') id: number,
        @Query() email: EmailInput): Promise<void> {
        const result = await this.deliveryMemoService.deleteDeliveryMemo(email, id);
    }
}
