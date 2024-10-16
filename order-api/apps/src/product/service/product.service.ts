import { Injectable } from '@nestjs/common';
import { Connection } from 'typeorm';

@Injectable()
export class ProductService {
    constructor(
        private readonly connection: Connection
    ) { }

}
