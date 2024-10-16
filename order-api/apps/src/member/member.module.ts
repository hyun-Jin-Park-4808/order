import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberRepository } from './entities/member.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            MemberRepository
        ])
    ],
    exports: [TypeOrmModule]
})
export class MemberModule {}
