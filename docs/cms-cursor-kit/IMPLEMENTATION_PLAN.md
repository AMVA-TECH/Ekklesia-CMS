# Implementation Plan — Church Management System (CMS)

**Status:** Proposed sequence; no release scope is approved until discovery and stakeholder validation.

| Phase | Workstream | Entry condition | Exit evidence |
|---|---|---|---|
| 0 | Discovery | Project initiated | Approved Pilot BRD, process maps, priorities and open issues |
| 1 | Foundation | Stack/repository assessed; architecture and security reviewed | Working environments, authentication/authorisation baseline, audit foundations |
| 2 | People and membership | Lifecycle and data rules approved | Tested person/visitor/member workflows |
| 3 | Ministries and church operations | Ministry/service workflows approved | Tested ministry, event/service and attendance workflows as prioritised |
| 4 | Communications | Communication needs and consent/preferences validated | Approved announcement/notification workflows |
| 5 | Finance (conditional) | Financial process owners approve scope and controls | Traceable and reconciled financial workflows |
| 6 | Pilot readiness | Core workflows feature-complete | UAT sign-off, migration rehearsal, training, backup/restore checks |
| 7 | Pilot evaluation | Pilot operating | Adoption, outcome, defect and improvement report |
| 8 | Productisation (later) | Pilot evidence and second-customer need | Productisation decision and validated reusable configuration |

## Release control

A phase is not complete because code exists. It is complete when:
- Business requirements and acceptance criteria are met.
- Permissions and data protection are verified.
- Relevant tests pass.
- Operational documentation exists.
- Process owners validate the workflow.
- Remaining limitations are accepted and recorded.

## MVP principle

The smallest useful release should solve a small number of real, frequent CrossLife problems reliably. Do not equate MVP with implementing every module listed in a church-management product catalogue.
