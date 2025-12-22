# ComplianceOS Compliance Content Library

This package contains the curated compliance content library for ComplianceOS, including:

- **Law Sources**: Korean statutes, decrees, and checklists
- **Obligation Templates**: Inspectable compliance obligations
- **Control Templates**: Implementation controls for obligations
- **Evidence Requirement Templates**: Required evidence for each control
- **Inspection Presets**: Pre-configured inspection pack templates

## Content Version: V0

The V0 content pack includes:

- 4 Law Sources (KR_LSA, KR_PIPA, MOEL_INSPECTOR_RULES, PIPA_SELF_CHECKLIST)
- 7 Obligation Templates (Labor + Privacy)
- 7 Control Templates
- 13 Evidence Requirement Templates
- 2 Inspection Presets (LABOR_MOEL, PRIVACY_PIPC)

## Usage

### Loading Content

To load the content into the database:

```bash
cd packages/compliance-content
npm install
npm run load
```

This will:
1. Create a new content version in the database
2. Upsert all law sources, obligations, controls, evidence requirements, and presets
3. Mark the new version as current

### Content Structure

All content is defined in YAML files:

- `sources.yaml` - Law sources
- `obligations.yaml` - Obligation templates with applicability rules
- `controls.yaml` - Control templates
- `evidence-requirements.yaml` - Evidence requirement templates with cadence rules
- `presets.yaml` - Inspection preset configurations

### Applicability Rules

Obligation templates include applicability rules in JSON DSL format. These rules determine which obligations apply to a company based on their profile:

```yaml
applicabilityRule:
  all:
    - field: headcount_band
      in: ["10-29", "30-99", "100-299", "300+"]
    - any:
        - field: data_types.customer_pii
          eq: true
```

Supported operators:
- `all`: All conditions must be true (AND)
- `any`: At least one condition must be true (OR)
- `in`: Field value must be in the list
- `eq`: Field value must equal the specified value

### Content Versioning

Each time the loader runs, it creates a new content version. This allows:
- Safe migration of existing tenant data
- Audit trail of content changes
- Rollback capability if needed

The `contentVersion` field on each template indicates which version it belongs to.

## Extending the Content

To add new content:

1. Edit the appropriate YAML file
2. Update the version number if needed
3. Run `npm run load` to load the changes
4. New content will be available immediately for new tenants
5. Existing tenants can optionally migrate to the new content version

## Development

The loader script (`loader.ts`) uses:
- `js-yaml` for parsing YAML files
- `@prisma/client` for database operations
- `tsx` for TypeScript execution

The loader performs upserts based on the `code` field, so re-running it is idempotent and safe.
