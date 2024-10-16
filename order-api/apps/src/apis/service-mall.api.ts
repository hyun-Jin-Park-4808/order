import { API, APICommonHeaders } from "@app/common/cls/api.cls";
import { GetELKProductResponse } from "@app/common/dto/product/get-elk-product.dto";
import { BadRequestException, InternalServerErrorException } from "@nestjs/common";

export class ServiceMallAPI extends API {
    constructor(
        commonHeaders?: APICommonHeaders,
    ) {
        super(false, commonHeaders);
    }

    handleInternalServerException() {
        throw new InternalServerErrorException(
            'ServiceMallAPI Internal server error',
        );
    }

    handleBadRequestException() {
        throw new BadRequestException('ServiceMallAPI Bad Request Error');
    }
    
    async getProduct(id: number): Promise<GetELKProductResponse> {

        const apiUrl = `${process.env.SERVICE_MALL_DOMAIN}/${id}`;
        const response = await this.request({
            method: 'get',
            url: apiUrl,
        });
        return response.data;
    }
}