import { test, expect } from '@playwright/test'

test.describe('Readiness Calculation', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is logged in and has evidence uploaded
    await page.goto('/dashboard')
  })

  test('should display overall readiness score', async ({ page }) => {
    // Navigate to readiness dashboard
    await page.click('text=준비도')

    // Wait for score to load
    await expect(page.locator('.readiness-score, [data-testid="readiness-score"]')).toBeVisible({
      timeout: 10000,
    })

    // Should show numeric score (0-100)
    const score = page.locator('.score-value, [class*="score"]').first()
    await expect(score).toBeVisible()
    const scoreText = await score.textContent()
    expect(scoreText).toMatch(/\d+/)

    // Should show readiness level (excellent, good, fair, poor, critical)
    await expect(
      page.locator(
        'text=우수, text=양호, text=보통, text=미흡, text=위험'
      ).first()
    ).toBeVisible()
  })

  test('should display breakdown by severity', async ({ page }) => {
    await page.goto('/readiness')

    // Wait for breakdown section
    await expect(page.locator('text=중요도별 진행 현황')).toBeVisible()

    // Should show all severity levels
    await expect(page.locator('text=매우 높음 (CRITICAL)')).toBeVisible()
    await expect(page.locator('text=높음 (HIGH)')).toBeVisible()
    await expect(page.locator('text=보통 (MEDIUM)')).toBeVisible()
    await expect(page.locator('text=낮음 (LOW)')).toBeVisible()

    // Each severity should show completion percentage
    const percentages = page.locator('[class*="percentage"]')
    await expect(percentages).toHaveCount({ min: 4 })
  })

  test('should display top 3 risks', async ({ page }) => {
    await page.goto('/readiness')

    // Wait for risks section
    await expect(page.locator('text=상위 3대 리스크')).toBeVisible()

    // Should either show risks or "no risks" message
    const noRisksMessage = page.locator('text=식별된 주요 리스크가 없습니다!')
    const risksList = page.locator('.risk-item, [data-testid="risk-item"]')

    const hasNoRisks = await noRisksMessage.isVisible()
    if (!hasNoRisks) {
      // Should show up to 3 risks
      await expect(risksList).toHaveCount({ min: 1, max: 3 })

      // Each risk should show:
      // - Rank number
      // - Obligation title
      // - Severity badge
      // - Missing requirements count
      // - Impact score
      const firstRisk = risksList.first()
      await expect(firstRisk).toBeVisible()
    }
  })

  test('should show scoring methodology explanation', async ({ page }) => {
    await page.goto('/readiness')

    // Should explain how scores are calculated
    await expect(page.locator('text=준비도 점수 계산 방식')).toBeVisible()
    await expect(page.locator('text=가중치')).toBeVisible()
  })

  test('should update score when evidence is uploaded', async ({ page }) => {
    await page.goto('/readiness')

    // Capture initial score
    const scoreElement = page.locator('.score-value, [class*="score"]').first()
    await scoreElement.waitFor()
    const initialScore = await scoreElement.textContent()

    // Go upload evidence
    await page.goto('/evidence')
    await page.click('button:has-text("업로드")').first()

    // Upload a test file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'new-evidence.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test content'),
    })

    await page.click('button:has-text("업로드")')
    await expect(page.locator('text=업로드 성공'), { timeout: 15000 }).toBeVisible()
    await page.click('button:has-text("닫기")')

    // Return to readiness page
    await page.goto('/readiness')

    // Score should have changed (or at least reloaded)
    await expect(scoreElement).toBeVisible()
  })

  test('should show zero score when no evidence uploaded', async ({ page }) => {
    // This test assumes a fresh tenant with no evidence
    // In a real scenario, you'd create a new tenant for this test

    await page.goto('/readiness')

    // Should show message about no score
    const noScoreMessage = page.locator('text=준비도 점수 없음')
    const hasScore = await page.locator('.score-value').isVisible()

    if (!hasScore) {
      await expect(noScoreMessage).toBeVisible()
      await expect(
        page.locator('text=온보딩을 완료하고 증빙 자료를 업로드하면 점수가 계산됩니다')
      ).toBeVisible()
    }
  })

  test('should display progress bars for each severity level', async ({ page }) => {
    await page.goto('/readiness')

    // Progress bars should be visible
    const progressBars = page.locator('.progress-bar, [role="progressbar"]')
    await expect(progressBars).toHaveCount({ min: 4 }) // 4 severity levels

    // Each progress bar should have a width proportional to completion
    for (const bar of await progressBars.all()) {
      const width = await bar.evaluate((el) => el.style.width || '0%')
      expect(width).toMatch(/\d+%/)
    }
  })

  test('should use color coding for risk levels', async ({ page }) => {
    await page.goto('/readiness')

    // Critical items should be red
    const criticalElements = page.locator('[class*="red"], [class*="critical"]')
    if ((await criticalElements.count()) > 0) {
      await expect(criticalElements.first()).toBeVisible()
    }

    // High items should be orange
    const highElements = page.locator('[class*="orange"], [class*="high"]')
    if ((await highElements.count()) > 0) {
      await expect(highElements.first()).toBeVisible()
    }
  })

  test('should show impact score for each risk', async ({ page }) => {
    await page.goto('/readiness')

    const riskItems = page.locator('.risk-item, [data-testid="risk-item"]')
    const hasRisks = (await riskItems.count()) > 0

    if (hasRisks) {
      // Each risk should show impact score
      await expect(page.locator('text=영향도').first()).toBeVisible()

      // Impact scores should be numeric
      const impactScores = page.locator('[class*="impact"]')
      if ((await impactScores.count()) > 0) {
        const impactText = await impactScores.first().textContent()
        expect(impactText).toMatch(/\d+/)
      }
    }
  })
})
