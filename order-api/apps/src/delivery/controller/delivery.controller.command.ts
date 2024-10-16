import { Body, Controller, Delete, Param, Patch, Post, Query } from '@nestjs/common';
import { DeliveryCommandService } from '../service/delivery.service.command';
import { ApiOperation } from '@nestjs/swagger';
import { HttpOkResponse } from '@app/common/utils/common-http-response';
import { EmailInput } from '../../member/dto/email.input.dto';
import { DeliveryInput } from '../dto/delivery.input.dto';
import { DeliveryOutput } from '../dto/delivery.output.dto';
import { ModifyDeliveryInput } from '../dto/modify-delivery.input.dto';

@Controller('deliveries')
export class DeliveryCommandController {
    constructor(
        private readonly deliveryService: DeliveryCommandService
    ) { }

    @ApiOperation({ summary: '배송지 신규 입력하기' })
    @Post()
    async addToDelivery(
        @Query() email: EmailInput,
        @Body() deliveryInput: DeliveryInput): Promise<DeliveryOutput> {
        const result = await this.deliveryService.addToDelivery(email, deliveryInput);
        return HttpOkResponse(result);
    }

    @ApiOperation({ summary: '배송지 수정하기' })
    @Patch(':id')
    async modifyDelivery(
        @Param('id') id: number,
        @Query() email: EmailInput,
        @Body() modifyDeliveryInput: ModifyDeliveryInput): Promise<DeliveryOutput> {
        const result = await this.deliveryService.modifyDelivery(id, email, modifyDeliveryInput);
        return HttpOkResponse(result);
    }

    @ApiOperation({ summary: '배송지 삭제하기' })
    @Delete(':id')
    async deleteDelivery(
        @Param('id') id: number,
        @Query() email: EmailInput): Promise<void> {
        await this.deliveryService.deleteDelivery(id, email);
    }

}
