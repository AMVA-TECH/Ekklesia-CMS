# Database Design Skill

## Purpose
Design data structures that reflect validated business concepts, lifecycles and integrity rules.

## Workflow
1. Start from approved workflows and requirements, not a desired ERD.
2. Identify entities, identifiers, attributes, relationships and lifecycle.
3. Define cardinality, optionality, ownership and uniqueness.
4. Identify sensitive fields and access boundaries.
5. Define constraints, indexes and deletion/retention behaviour.
6. Plan migrations and data conversion.
7. Validate with realistic use cases and query patterns.

## CrossLife domain cautions
Keep Person, User Account, Membership, Ministry Participation, Leadership Position and Leadership Assignment distinct. Do not assume one person has one role or one ministry. Do not add branch tables solely for hypothetical future branches.

## Integrity
Prefer database constraints for invariant data rules. Use transactions for multi-record operations. Preserve historical records where required. Use synthetic data in tests.
