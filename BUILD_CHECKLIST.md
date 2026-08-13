# BUILD_CHECKLIST.md
# Build Verification & Completion Checklist

> This document verifies that the implementation satisfies the engineering standards defined by AGENT.md.
>
> AGENT.md is the source of truth.
>
> BUILD_CHECKLIST.md is its verification layer.
>
> A task is not complete until this checklist has been reviewed.

---

# Scope

## New Projects

For new software:

Review every section.

No section should be skipped unless it is genuinely not applicable.

---

## Existing Projects

For edits, bug fixes, refactors and feature additions:

Only review the sections affected by the change.

However—

If a shared system, architecture or core component was modified:

Review every affected dependency listed inside APP_MAP.md.

---

# 1. Planning

☐ Problem fully understood.

☐ Better solutions considered.

☐ Existing solutions researched.

☐ Open-source alternatives evaluated.

☐ Build vs Integrate decision made.

☐ Version 1 foundation improved where possible.

☐ Planning documentation updated.

---

# 2. Decision Making

☐ Simpler solution considered.

☐ Long-term maintainability considered.

☐ Future scalability considered.

☐ Trade-offs evaluated.

☐ Significant engineering decisions documented.

---

# 3. Research

☐ Official documentation consulted.

☐ Official repositories reviewed.

☐ Recommended implementation followed.

☐ Critical assumptions verified.

---

# 4. Architecture

☐ Responsibilities clearly separated.

☐ Components remain modular.

☐ Shared systems remain stable.

☐ Dependencies remain intentional.

☐ No unnecessary duplication.

☐ Large systems split appropriately.

☐ Existing architecture respected.

---

# 5. Maintainability

☐ Code is understandable.

☐ Naming is clear.

☐ Files remain manageable.

☐ No unnecessary abstraction.

☐ No unnecessary complexity.

☐ Technical debt minimized.

---

# 6. Design

☐ DESIGN.md followed.

☐ Design remains consistent.

☐ Hardware-conscious decisions maintained.

☐ No unnecessary visual complexity.

☐ UI remains consistent.

---

# 7. User Experience

☐ Empty states implemented.

☐ Loading states implemented.

☐ Success states implemented.

☐ Error states implemented.

☐ Help section available.

☐ User messaging matches product context.

---

# 8. Error Handling

☐ Validation exists.

☐ Errors are context-aware.

☐ Recovery considered.

☐ Graceful failure implemented.

☐ Logging included where appropriate.

☐ Silent failures avoided.

---

# 9. Performance

☐ Heavy systems lazy loaded.

☐ Expensive systems cold-loaded.

☐ RAM usage reviewed.

☐ CPU usage reviewed.

☐ Rendering optimized.

☐ Background work minimized.

---

# 10. Hardware

☐ Low-end hardware considered.

☐ Optional heavy features remain optional.

☐ Resource budgets respected.

☐ Efficient alternatives evaluated.

---

# 11. AI

(If Applicable)

☐ Latest supported models used.

☐ Deprecated models avoided.

☐ Better model options evaluated.

☐ BYOK supported where practical.

☐ OpenAI-compatible endpoints supported where practical.

☐ Community fallback implemented where appropriate.

☐ Smaller models evaluated.

☐ AI used only where it adds value.

---

# 12. Connectivity

☐ Online behavior defined.

☐ Offline behavior defined.

☐ Transition behavior defined.

☐ Synchronization behavior defined.

☐ Failure behavior defined.

---

# 13. Documentation

☐ README updated.

☐ USAGE updated.

☐ DESIGN updated.

☐ APP_MAP updated.

☐ Planning documents updated.

☐ Documentation matches implementation.

---

# 14. Skills

☐ Appropriate skills consulted.

☐ Recommendations applied.

☐ Domain-specific guidance followed.

---

# 15. Security

(If Applicable)

☐ SECURITY.md followed.

☐ Inputs validated.

☐ Outputs validated.

☐ Secrets protected.

☐ Permissions reviewed.

☐ External resources trusted appropriately.

---

# 16. Data

(If Applicable)

☐ DATA.md followed.

☐ Data integrity preserved.

☐ Migrations documented.

☐ Import compatibility maintained.

☐ Export compatibility maintained.

☐ Existing user data preserved.

---

# 17. Existing Systems

☐ Existing functionality preserved.

☐ Shared systems remain compatible.

☐ No unintended regressions.

☐ Related modules reviewed using APP_MAP.md.

---

# 18. Configuration

☐ Hardcoded values avoided where appropriate.

☐ Configurable values centralized.

☐ Environment configuration verified.

---

# 19. Completion

☐ Feature fully implemented.

☐ Fully integrated.

☐ Properly documented.

☐ Properly tested.

☐ Maintainable.

☐ Ready for future development.

---

# Final Build Summary

## Build Type

☐ New Project

☐ Major Feature

☐ Minor Feature

☐ Bug Fix

☐ Refactor

☐ Documentation

☐ Hotfix

---

## Documents Updated

☐ README

☐ USAGE

☐ DESIGN

☐ APP_MAP

☐ SECURITY

☐ DATA

☐ Other

---

## Architecture

☐ Changed

☐ Unchanged

---

## Shared Systems

☐ Modified

☐ Unchanged

---

## Migration Required

☐ Yes

☐ No

---

## Checklist Status

☐ Passed

☐ Passed With Documented Exceptions

☐ Requires Additional Work

---

## Final Status

☐ Ready For Release

☐ Ready For Review

☐ Continue Development Required

---

# Completion Rule

A task is complete only when:

- Every applicable checklist section has been reviewed.
- APP_MAP.md reflects structural changes.
- Documentation matches the implementation.
- Required companion documents are updated.
- AGENT.md principles have been upheld.

Only then should the Builder declare the task complete.
