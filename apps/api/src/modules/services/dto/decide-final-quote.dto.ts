import { IsIn } from 'class-validator';

export class DecideFinalQuoteDto {
  @IsIn(['accepted', 'rejected'])
  decision!: 'accepted' | 'rejected';
}