import { IsNotEmpty, IsString, IsISO8601, IsOptional, ValidationArguments, registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Custom validator to ensure date is in the future
function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // Let @IsNotEmpty handle required validation
          const date = new Date(value);
          const now = new Date();
          // Add 5 minute buffer to account for clock skew
          now.setMinutes(now.getMinutes() - 5);
          return date > now;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Appointment must be scheduled in the future';
        },
      },
    });
  };
}

// Custom validator to ensure endAt is after startAt
@ValidatorConstraint({ name: 'isEndAfterStart', async: false })
class IsEndAfterStartConstraint implements ValidatorConstraintInterface {
  validate(endAt: any, args: ValidationArguments) {
    if (!endAt) return true; // Optional field
    const dto = args.object as ProposeAppointmentDto;
    if (!dto.startAt) return true; // Can't compare if startAt is missing
    
    const start = new Date(dto.startAt);
    const end = new Date(endAt);
    return end > start;
  }

  defaultMessage(args: ValidationArguments) {
    return 'End time must be after start time';
  }
}

function IsEndAfterStart(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsEndAfterStartConstraint,
    });
  };
}

export class ProposeAppointmentDto {
  @ApiProperty({ description: 'Start time of the appointment (ISO 8601 format)', example: '2024-12-15T10:00:00Z' })
  @IsISO8601()
  @IsNotEmpty()
  @IsFutureDate()
  startAt: string;

  @ApiProperty({ description: 'End time of the appointment (ISO 8601 format)', example: '2024-12-15T12:00:00Z', required: false })
  @IsISO8601()
  @IsOptional()
  @IsFutureDate()
  @IsEndAfterStart()
  endAt?: string;

  @ApiProperty({ description: 'Additional notes for the appointment', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
