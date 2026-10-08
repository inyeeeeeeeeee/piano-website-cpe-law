# CLAUDE.md - Project Guidelines for Piano Website CPE Law

## Core Rule: System Architecture Compliance

**All development activities must strictly adhere to the system architecture defined in `SYSTEM_ARCHITECTURE.md`.** This rule ensures consistency, maintainability, and alignment with project goals throughout the development lifecycle.

### Implementation Requirements:
1. **Architecture-First Approach**: Before implementing any feature, consult `SYSTEM_ARCHITECTURE.md` to understand how it fits within the defined components and data flows.
2. **Component Boundaries**: Respect the separation of concerns between frontend, backend, database, and external services as outlined in the architecture.
3. **Technology Adherence**: Use only the approved technologies and patterns specified in the architecture document unless explicit approval is obtained for alternatives.
4. **Data Flow Compliance**: Ensure all data interactions follow the specified flows and API contracts.
5. **Security and Performance**: Implement all features with consideration for the security and performance guidelines in the architecture.

### Verification Process:
- Code reviews must include verification against `SYSTEM_ARCHITECTURE.md`
- Architectural deviations require documented justification and team approval
- Updates to `SYSTEM_ARCHITECTURE.md` must follow the project's change control process

### Related Files:
- `SYSTEM_ARCHITECTURE.md` - Defines the target architecture to follow
- This file (`CLAUDE.md`) - Contains this rule and other project guidelines

---
*This rule is effective immediately and applies to all project work including planning, development, testing, and deployment.*