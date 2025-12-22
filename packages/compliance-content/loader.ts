#!/usr/bin/env tsx

import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface YamlSource {
  code: string
  titleKo: string
  titleEn?: string
  issuer: string
  type: 'STATUTE' | 'DECREE' | 'CHECKLIST' | 'MANUAL'
  url?: string
  versionDate?: string
  notes?: string
}

interface ApplicabilityRule {
  all?: Array<{ field: string; in?: string[]; eq?: boolean | string }>
  any?: Array<{ field: string; in?: string[]; eq?: boolean | string }>
}

interface YamlObligation {
  code: string
  titleKo: string
  title: string
  summaryKo?: string
  descriptionKo: string
  description: string
  inspectorQuestionsKo?: string[]
  domain: string
  evidenceFrequency: string
  severityDefault?: string
  sourceRefs?: string[]
  retentionRule?: {
    minYears?: number
    triggerEvent?: string
  }
  applicabilityRule?: ApplicabilityRule
}

interface YamlControl {
  code: string
  obligationCode: string
  titleKo: string
  title: string
  descriptionKo: string
  description: string
  implementationGuidance?: string
}

interface YamlEvidenceRequirement {
  code: string
  controlCode: string
  titleKo: string
  cadenceRule: {
    type: string
    reviewMonths?: number
  }
  requiredFields: string[]
  acceptanceCriteria: string[]
  examplesKo: string[]
}

interface YamlPreset {
  code: string
  titleKo: string
  includedObligationCodes: string[]
  folderStructureJson: {
    folders: Array<{
      name: string
      description: string
    }>
  }
  summaryTemplateKo: string
}

async function loadSources(contentVersion: number) {
  const filePath = path.join(__dirname, 'sources.yaml')
  const fileContents = fs.readFileSync(filePath, 'utf8')
  const data = yaml.load(fileContents) as { version: number; sources: YamlSource[] }

  console.log(`📄 Loading ${data.sources.length} law sources...`)

  for (const source of data.sources) {
    await prisma.lawSource.upsert({
      where: { code: source.code },
      update: {
        titleKo: source.titleKo,
        titleEn: source.titleEn,
        issuer: source.issuer,
        type: source.type,
        url: source.url,
        versionDate: source.versionDate ? new Date(source.versionDate) : null,
        notes: source.notes,
        isActive: true,
      },
      create: {
        code: source.code,
        titleKo: source.titleKo,
        titleEn: source.titleEn,
        issuer: source.issuer,
        type: source.type,
        url: source.url,
        versionDate: source.versionDate ? new Date(source.versionDate) : null,
        notes: source.notes,
        isActive: true,
      },
    })
    console.log(`  ✓ ${source.code}: ${source.titleKo}`)
  }
}

async function loadObligations(contentVersion: number) {
  const filePath = path.join(__dirname, 'obligations.yaml')
  const fileContents = fs.readFileSync(filePath, 'utf8')
  const data = yaml.load(fileContents) as { version: number; obligations: YamlObligation[] }

  console.log(`📋 Loading ${data.obligations.length} obligation templates...`)

  for (const obl of data.obligations) {
    const existing = await prisma.obligationTemplate.findUnique({
      where: { code: obl.code },
    })

    if (existing) {
      await prisma.obligationTemplate.update({
        where: { code: obl.code },
        data: {
          title: obl.title,
          titleKo: obl.titleKo,
          summaryKo: obl.summaryKo,
          description: obl.description,
          descriptionKo: obl.descriptionKo,
          inspectorQuestionsKo: obl.inspectorQuestionsKo || [],
          domain: obl.domain as any,
          evidenceFrequency: obl.evidenceFrequency as any,
          severityDefault: obl.severityDefault as any,
          sourceRefs: obl.sourceRefs || [],
          retentionRule: obl.retentionRule as any,
          applicabilityRule: obl.applicabilityRule as any,
          contentVersion,
          isActive: true,
        },
      })
    } else {
      await prisma.obligationTemplate.create({
        data: {
          code: obl.code,
          title: obl.title,
          titleKo: obl.titleKo,
          summaryKo: obl.summaryKo,
          description: obl.description,
          descriptionKo: obl.descriptionKo,
          inspectorQuestionsKo: obl.inspectorQuestionsKo || [],
          domain: obl.domain as any,
          evidenceFrequency: obl.evidenceFrequency as any,
          severity: 'MEDIUM',
          severityDefault: obl.severityDefault as any,
          sourceRefs: obl.sourceRefs || [],
          retentionRule: obl.retentionRule as any,
          applicabilityRule: obl.applicabilityRule as any,
          contentVersion,
          isActive: true,
        },
      })
    }
    console.log(`  ✓ ${obl.code}: ${obl.titleKo}`)
  }
}

async function loadControls(contentVersion: number) {
  const filePath = path.join(__dirname, 'controls-full.yaml')
  const fileContents = fs.readFileSync(filePath, 'utf8')
  const data = yaml.load(fileContents) as { version: number; controls: YamlControl[] }

  console.log(`🛡️  Loading ${data.controls.length} control templates...`)

  for (const ctl of data.controls) {
    const existing = await prisma.controlTemplate.findUnique({
      where: { code: ctl.code },
    })

    const dataToSave = {
      obligationCode: ctl.obligationCode,
      name: ctl.title,
      nameKo: ctl.titleKo,
      description: ctl.description,
      descriptionKo: ctl.descriptionKo,
      purposeKo: '',
      domain: 'LABOR' as any,
      contentVersion,
      isActive: true,
    }

    if (existing) {
      await prisma.controlTemplate.update({
        where: { code: ctl.code },
        data: dataToSave,
      })
    } else {
      await prisma.controlTemplate.create({
        data: {
          code: ctl.code,
          ...dataToSave,
        },
      })
    }
    console.log(`  ✓ ${ctl.code}: ${ctl.titleKo}`)
  }
}

async function loadEvidenceRequirements(contentVersion: number) {
  const filePath = path.join(__dirname, 'evidence-requirements-full.yaml')
  const fileContents = fs.readFileSync(filePath, 'utf8')
  const data = yaml.load(fileContents) as {
    version: number
    evidenceRequirements: YamlEvidenceRequirement[]
  }

  console.log(`📎 Loading ${data.evidenceRequirements.length} evidence requirement templates...`)

  for (const ev of data.evidenceRequirements) {
    const existing = await prisma.evidenceRequirementTemplate.findUnique({
      where: { code: ev.code },
    })

    const dataToSave = {
      controlCode: ev.controlCode,
      titleKo: ev.titleKo,
      cadenceRule: ev.cadenceRule as any,
      requiredFields: ev.requiredFields,
      acceptanceCriteria: ev.acceptanceCriteria,
      examplesKo: ev.examplesKo,
      contentVersion,
      isActive: true,
    }

    if (existing) {
      await prisma.evidenceRequirementTemplate.update({
        where: { code: ev.code },
        data: dataToSave,
      })
    } else {
      await prisma.evidenceRequirementTemplate.create({
        data: {
          code: ev.code,
          ...dataToSave,
        },
      })
    }
    console.log(`  ✓ ${ev.code}: ${ev.titleKo}`)
  }
}

async function loadPresets(contentVersion: number) {
  const filePath = path.join(__dirname, 'presets.yaml')
  const fileContents = fs.readFileSync(filePath, 'utf8')
  const data = yaml.load(fileContents) as { version: number; presets: YamlPreset[] }

  console.log(`📦 Loading ${data.presets.length} inspection presets...`)

  for (const preset of data.presets) {
    const existing = await prisma.inspectionPreset.findUnique({
      where: { code: preset.code },
    })

    const dataToSave = {
      titleKo: preset.titleKo,
      includedObligationCodes: preset.includedObligationCodes,
      folderStructureJson: preset.folderStructureJson as any,
      summaryTemplateKo: preset.summaryTemplateKo,
      contentVersion,
      isActive: true,
    }

    if (existing) {
      await prisma.inspectionPreset.update({
        where: { code: preset.code },
        data: dataToSave,
      })
    } else {
      await prisma.inspectionPreset.create({
        data: {
          code: preset.code,
          ...dataToSave,
        },
      })
    }
    console.log(`  ✓ ${preset.code}: ${preset.titleKo}`)
  }
}

async function main() {
  console.log('🚀 ComplianceOS Content Loader v1.0')
  console.log('===================================\n')

  try {
    // Create a new content version
    const latestVersion = await prisma.contentVersion.findFirst({
      where: { isCurrent: true },
      orderBy: { version: 'desc' },
    })

    const newVersion = (latestVersion?.version || 0) + 1

    // Mark previous versions as not current
    await prisma.contentVersion.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    })

    // Create new version record
    const versionRecord = await prisma.contentVersion.create({
      data: {
        version: newVersion,
        loadedBy: process.env.USER || 'system',
        sourceFile: 'V0 Content Pack',
        changesSummary: {
          sources: 4,
          obligations: 7,
          controls: 7,
          evidenceRequirements: 13,
          presets: 2,
        },
        isCurrent: true,
      },
    })

    console.log(`📌 Created content version: v${newVersion}\n`)

    // Load all content
    await loadSources(newVersion)
    console.log()
    await loadObligations(newVersion)
    console.log()
    await loadControls(newVersion)
    console.log()
    await loadEvidenceRequirements(newVersion)
    console.log()
    await loadPresets(newVersion)
    console.log()

    console.log('✅ Content loading completed successfully!')
    console.log(`📊 Content version: v${newVersion}`)
  } catch (error) {
    console.error('❌ Error loading content:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('\n👍 Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
