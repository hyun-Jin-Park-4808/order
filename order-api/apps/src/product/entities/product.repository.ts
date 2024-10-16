import { EntityRepository, Repository } from "typeorm";
import { Product, ServiceProductSellingStatus } from "./product.entity";
import { BadRequestException } from "@nestjs/common";

@EntityRepository(Product)
export class ProductRepository extends Repository<Product> {
    async getById(id: number): Promise<Product> {
        const product = await this.findOne(id);
        if(!product) {
            throw new BadRequestException(`Not found product, id: ${id}`);
        }
        if(product.sellingStatus !== ServiceProductSellingStatus.OPEN) {
            throw new BadRequestException(`Not selling product, 
                id: ${id}, status: ${product.sellingStatus}`);
        }
        return product;
    }
}