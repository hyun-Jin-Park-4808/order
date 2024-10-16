import { EntityRepository, Repository } from "typeorm";
import { Member } from "./member.entity";
import { BadRequestException } from "@nestjs/common";

@EntityRepository(Member)
export class MemberRepository extends Repository<Member> {
    async getByEmail(email: string): Promise<Member> {
        return await this.verifyMember(email);
    }

    async validateMember(email: string): Promise<void> {
        await this.verifyMember(email);
    }

    private async verifyMember(email: string) {
        const member = await this.findOne({ where: { email: email } });
        if (!member) {
            throw new BadRequestException(`Not found member, email: ${email}`);
        }
        if (!member.isVerified) {
            throw new BadRequestException(`Not verified member, email: ${email}`);
        }
        return member;
    }
}