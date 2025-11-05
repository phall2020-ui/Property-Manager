import { IsIn } from 'class-validator';

export class UpdateTicketStatusDto {
  @IsIn(['OPEN', 'TRIAGED', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'AUDITED'])
  status: string;
}