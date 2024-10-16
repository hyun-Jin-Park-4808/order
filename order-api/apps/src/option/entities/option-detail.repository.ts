import { EntityRepository, In, Repository } from "typeorm";
import { OptionDetail } from "./option-detail.entity";
import { BadRequestException } from "@nestjs/common";

@EntityRepository(OptionDetail)
export class OptionDetailRepository extends Repository<OptionDetail> {
    async getByIds(ids: number[]): Promise<OptionDetail[]> {
        if (!ids || ids.length === 0) {
            throw new BadRequestException('ID list cannot be empty.');
        }

        const optionDetails = await this.find({
            where: {
                id: In(ids),
            },
            relations: ['optionGroup', 'optionGroup.product']
        });

        if(!optionDetails || optionDetails.length === 0) {
            throw new BadRequestException(`Not found option details, idList: ${ids}`);
        }
        return optionDetails;
    }

}