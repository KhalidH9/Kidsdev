import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignments.controller';
import { ChildrenModule } from '../children/children.module';

/**
 * Assignment writes go through ChildrenService (single source of truth for
 * normalization + validation). This module exposes read helpers and direct
 * single-assignment endpoints for convenience.
 */
@Module({
  imports: [ChildrenModule],
  controllers: [AssignmentsController],
})
export class AssignmentsModule {}
