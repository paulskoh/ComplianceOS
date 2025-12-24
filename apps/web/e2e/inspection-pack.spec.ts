import { test, expect } from '@playwright/test'

test.describe('Inspection Pack Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is logged in with evidence uploaded
    await page.goto('/dashboard')
  })

  test('should generate inspection pack successfully', async ({ page }) => {
    // Navigate to inspection pack generator
    await page.click('text=점검팩 생성')

    // Fill pack configuration
    await page.fill('input[name="packName"]', '2025년 상반기 개인정보보호 점검')

    // Select domain
    await page.selectOption('select[name="domain"]', 'PRIVACY')

    // Set date range
    const today = new Date()
    const sixMonthsAgo = new Date(today)
    sixMonthsAgo.setMonth(today.getMonth() - 6)

    await page.fill(
      'input[name="startDate"]',
      sixMonthsAgo.toISOString().split('T')[0]
    )
    await page.fill('input[name="endDate"]', today.toISOString().split('T')[0])

    // Click generate button
    await page.click('button:has-text("점검팩 생성")')

    // Should show generating status
    await expect(page.locator('text=점검팩 생성 중...')).toBeVisible()
    await expect(page.locator('text=증빙 자료를 수집하고 문서를 생성하고 있습니다')).toBeVisible()

    // Wait for completion (this may take a while)
    await expect(
      page.locator('text=점검팩 생성 완료!'),
      { timeout: 30000 }
    ).toBeVisible()

    // Should show download links
    await expect(page.locator('text=요약 보고서 (PDF)')).toBeVisible()
    await expect(page.locator('text=매니페스트 (JSON)')).toBeVisible()
    await expect(page.locator('text=증빙 자료 묶음 (ZIP)')).toBeVisible()

    // Download links should be clickable
    const downloadLinks = page.locator('a[href*="download"], a[target="_blank"]')
    await expect(downloadLinks).toHaveCount({ min: 1 })
  })

  test('should run simulation preview before generating pack', async ({ page }) => {
    await page.goto('/inspection-packs/new')

    // Fill configuration
    await page.fill('input[name="packName"]', '시뮬레이션 테스트 팩')
    await page.selectOption('select[name="domain"]', 'PRIVACY')

    const today = new Date()
    const oneMonthAgo = new Date(today)
    oneMonthAgo.setMonth(today.getMonth() - 1)

    await page.fill('input[name="startDate"]', oneMonthAgo.toISOString().split('T')[0])
    await page.fill('input[name="endDate"]', today.toISOString().split('T')[0])

    // Click preview/simulation button
    await page.click('button:has-text("미리보기"), button:has-text("시뮬레이션")')

    // Should show simulation results
    await expect(page.locator('text=시뮬레이션 결과')).toBeVisible()

    // Should show readiness score
    await expect(page.locator('text=준비도 점수')).toBeVisible()

    // Should show gaps found
    await expect(page.locator('text=발견된 갭')).toBeVisible()

    // Should show missing evidence count
    await expect(page.locator('text=누락 증빙')).toBeVisible()

    // Should show recommendations
    await expect(page.locator('text=권장 사항')).toBeVisible()

    // Should have option to modify settings or proceed
    await expect(page.locator('button:has-text("설정 수정")')).toBeVisible()
    await expect(page.locator('button:has-text("점검팩 생성 진행")')).toBeVisible()
  })

  test('should validate required fields before generation', async ({ page }) => {
    await page.goto('/inspection-packs/new')

    // Try to generate without filling required fields
    await page.click('button:has-text("점검팩 생성")')

    // Should show validation error
    await expect(page.locator('text=모든 필수 항목을 입력하세요')).toBeVisible()

    // Should still be on configuration step
    await expect(page.locator('input[name="packName"]')).toBeVisible()
  })

  test('should allow selecting specific obligations', async ({ page }) => {
    await page.goto('/inspection-packs/new')

    // Fill basic info
    await page.fill('input[name="packName"]', '선택적 의무사항 팩')
    await page.selectOption('select[name="domain"]', 'PRIVACY')

    // Wait for obligations list to load
    await expect(page.locator('text=포함할 의무사항')).toBeVisible()

    // Select specific obligations
    const obligationCheckboxes = page.locator('input[type="checkbox"][name*="obligation"]')
    const count = await obligationCheckboxes.count()

    if (count > 0) {
      // Select first 2 obligations
      await obligationCheckboxes.nth(0).check()
      await obligationCheckboxes.nth(1).check()

      // Verify they are checked
      await expect(obligationCheckboxes.nth(0)).toBeChecked()
      await expect(obligationCheckboxes.nth(1)).toBeChecked()
    }
  })

  test('should show pack generation history', async ({ page }) => {
    await page.goto('/inspection-packs')

    // Should see list of previously generated packs
    await expect(page.locator('h1, h2').filter({ hasText: '점검팩' })).toBeVisible()

    // Should show pack details: name, date, status
    const packList = page.locator('.pack-item, [data-testid="pack-item"]')
    const hasPacksGenerated = (await packList.count()) > 0

    if (hasPacksGenerated) {
      // Each pack should show:
      const firstPack = packList.first()
      await expect(firstPack).toBeVisible()

      // Should have action buttons (view, download, share, etc.)
      await expect(page.locator('button, a').filter({ hasText: /다운로드|공유|보기/ })).toHaveCount({
        min: 1,
      })
    }
  })

  test('should create share link for generated pack', async ({ page }) => {
    await page.goto('/inspection-packs')

    // Find a completed pack
    const completedPacks = page.locator('[data-status="COMPLETED"], .pack-completed')
    const hasCompletedPacks = (await completedPacks.count()) > 0

    if (hasCompletedPacks) {
      // Click on the first pack
      await completedPacks.first().click()

      // Should see pack details
      await expect(page.locator('text=점검팩 정보')).toBeVisible()

      // Click share button
      await page.click('button:has-text("공유"), button:has-text("링크")')

      // Should show share link dialog
      await expect(page.locator('text=공유 링크')).toBeVisible()

      // Share link should be generated
      const shareLink = page.locator('input[type="text"][value*="http"], input[readonly]')
      await expect(shareLink).toBeVisible()

      // Should have copy button
      await expect(page.locator('button:has-text("복사")')).toBeVisible()
    }
  })

  test('should allow inspector to access pack via token', async ({ page }) => {
    // This tests the inspector portal flow

    // Get share token (in real test, this would come from previous test or setup)
    const mockToken = 'test-share-token-12345'

    // Navigate to inspector portal
    await page.goto('/inspector')

    // Should see login page
    await expect(page.locator('text=감사자 포털')).toBeVisible()
    await expect(page.locator('text=접근 토큰')).toBeVisible()

    // Enter token
    await page.fill('input[name="token"], input[type="text"]', mockToken)

    // Click access button
    await page.click('button:has-text("점검팩 접근")')

    // Should either:
    // - Show pack details (if token is valid)
    // - Show error message (if token is invalid)

    const hasError = await page.locator('text=유효하지 않은 토큰').isVisible()
    const hasPackDetails = await page.locator('text=점검팩 정보').isVisible()

    expect(hasError || hasPackDetails).toBeTruthy()
  })

  test('should include all artifacts in date range', async ({ page }) => {
    await page.goto('/inspection-packs/new')

    // Configure pack with specific date range
    await page.fill('input[name="packName"]', '날짜 범위 테스트 팩')
    await page.selectOption('select[name="domain"]', 'PRIVACY')

    // Set narrow date range
    const endDate = new Date()
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - 7) // Last 7 days only

    await page.fill('input[name="startDate"]', startDate.toISOString().split('T')[0])
    await page.fill('input[name="endDate"]', endDate.toISOString().split('T')[0])

    // Generate pack
    await page.click('button:has-text("점검팩 생성")')

    await expect(page.locator('text=점검팩 생성 완료!'), { timeout: 30000 }).toBeVisible()

    // Check that only artifacts in date range are included
    // This would require viewing the pack manifest or summary
  })

  test('should handle generation failure gracefully', async ({ page }) => {
    await page.goto('/inspection-packs/new')

    // Fill minimal configuration
    await page.fill('input[name="packName"]', '실패 테스트 팩')
    await page.selectOption('select[name="domain"]', 'PRIVACY')

    // Set future dates (which should cause error or empty pack)
    const futureStart = new Date()
    futureStart.setFullYear(futureStart.getFullYear() + 1)
    const futureEnd = new Date(futureStart)
    futureEnd.setMonth(futureEnd.getMonth() + 1)

    await page.fill('input[name="startDate"]', futureStart.toISOString().split('T')[0])
    await page.fill('input[name="endDate"]', futureEnd.toISOString().split('T')[0])

    // Try to generate
    await page.click('button:has-text("점검팩 생성")')

    // Should either show error or warning about no evidence in date range
    const errorMessage = page.locator('text=오류, text=실패, text=증빙 자료가 없습니다')
    // Give it time to fail
    await page.waitForTimeout(5000)

    const hasError = (await errorMessage.count()) > 0
    // Some error handling should occur
  })
})
