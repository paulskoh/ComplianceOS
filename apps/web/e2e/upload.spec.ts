import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Document Upload and Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is logged in and has completed onboarding
    await page.goto('/dashboard')
  })

  test('should upload document successfully', async ({ page }) => {
    // Navigate to evidence requirements page or find an upload button
    await page.click('text=증빙 자료 관리')

    // Wait for evidence list to load
    await expect(page.locator('text=증빙 요건')).toBeVisible()

    // Click upload button for the first requirement
    await page.click('button:has-text("업로드")').first()

    // Upload modal should be visible
    await expect(page.locator('text=증빙 자료 업로드')).toBeVisible()

    // Create a test file
    const testFilePath = path.join(__dirname, 'fixtures', 'test-document.pdf')

    // Set up file input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    // Verify file is selected
    await expect(page.locator(`text=test-document.pdf`)).toBeVisible()

    // Click upload button
    await page.click('button:has-text("업로드")')

    // Wait for upload to complete
    await expect(page.locator('text=업로드 중...'), { timeout: 5000 }).toBeVisible()
    await expect(
      page.locator('text=업로드 성공'),
      { timeout: 15000 }
    ).toBeVisible()

    // Close modal
    await page.click('button:has-text("닫기")')

    // Verify document appears in the list
    await expect(page.locator('text=test-document.pdf')).toBeVisible()
  })

  test('should show upload progress during file upload', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('text=증빙 자료 관리')
    await page.click('button:has-text("업로드")').first()

    const testFilePath = path.join(__dirname, 'fixtures', 'large-document.pdf')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(testFilePath)

    await page.click('button:has-text("업로드")')

    // Progress indicator should be visible
    await expect(page.locator('.progress-bar, [role="progressbar"]')).toBeVisible()
  })

  test('should handle upload errors gracefully', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('text=증빙 자료 관리')
    await page.click('button:has-text("업로드")').first()

    // Try to upload without selecting a file
    await page.click('button:has-text("업로드")')

    // Should show error message
    await expect(page.locator('text=파일을 선택하세요')).toBeVisible()
  })

  test('should support drag and drop upload', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('text=증빙 자료 관리')
    await page.click('button:has-text("업로드")').first()

    // Verify drop zone is visible
    await expect(
      page.locator('text=파일을 여기에 드래그하거나 클릭하여 선택하세요')
    ).toBeVisible()

    const testFilePath = path.join(__dirname, 'fixtures', 'test-document.pdf')

    // Simulate drag and drop
    const dropZone = page.locator('.drop-zone, [data-testid="drop-zone"]').first()
    await dropZone.setInputFiles(testFilePath)

    // Verify file is selected
    await expect(page.locator('text=test-document.pdf')).toBeVisible()
  })

  test('should display uploaded artifacts with status badges', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('text=증빙 자료 관리')

    // Wait for list to load
    await expect(page.locator('text=증빙 요건')).toBeVisible()

    // Find a requirement with uploaded artifacts
    const requirement = page.locator('.evidence-requirement').first()
    await requirement.click()

    // Should show artifact status (pending, analyzed, approved, etc.)
    const statusBadges = page.locator('.status-badge, [class*="badge"]')
    await expect(statusBadges.first()).toBeVisible()
  })

  test('should filter evidence requirements by control', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('text=증빙 자료 관리')

    // Evidence should be grouped by control
    await expect(page.locator('.control-group, [data-testid="control-group"]')).toHaveCount(
      { min: 1 }
    )

    // Each control should show number of requirements
    await expect(page.locator('text=개의 증빙 요건')).toBeVisible()
  })

  test('should show acceptance criteria when expanded', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('text=증빙 자료 관리')

    // Click on a requirement to expand
    const requirement = page.locator('.evidence-requirement-title, button').first()
    await requirement.click()

    // Should show acceptance criteria
    await expect(page.locator('text=인정 기준')).toBeVisible()

    // Should show freshness window
    await expect(page.locator('text=유효 기간')).toBeVisible()
  })

  test('should show required vs optional evidence indicators', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('text=증빙 자료 관리')

    // Should see "필수 제출" badge for required evidence
    await expect(page.locator('text=필수 제출')).toHaveCount({ min: 1 })

    // May see "선택사항" or no badge for optional evidence
  })
})
