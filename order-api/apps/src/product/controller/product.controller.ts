import { Body, Controller, Post, Query } from '@nestjs/common';
import { ProductService } from '../service/product.service';

@Controller('products')
export class ProductController {
    cartService: any;
    constructor(
        private readonly productService: ProductService
    ) { }
}


