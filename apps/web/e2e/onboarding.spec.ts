import { test, expect } from '@playwright/test'

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start at the onboarding page (assumes user is already registered/logged in)
    await page.goto('/onboarding')
  })

  test('should complete full onboarding process', async ({ page }) => {
    // Step 1: Company Basic Information
    await expect(page.locator('h2').filter({ hasText: '회사 기본 정보' })).toBeVisible()

    // Fill company name
    await page.fill('input[name="companyName"]', '주식회사 테스트')

    // Select industry
    await page.selectOption('select[name="industry"]', '정보통신업')

    // Select employee count
    await page.selectOption('select[name="employeeCount"]', '10-49')

    // Select annual revenue
    await page.selectOption('select[name="annualRevenue"]', '10억-50억')

    // Fill DPO information
    await page.fill('input[name="dpoName"]', '홍길동')
    await page.fill('input[name="dpoEmail"]', 'dpo@test.com')
    await page.fill('input[name="dpoPhone"]', '010-1234-5678')

    // Go to next step
    await page.click('button:has-text("다음")')

    // Step 2: Personal Data Processing Status
    await expect(page.locator('h2').filter({ hasText: '개인정보 처리 현황' })).toBeVisible()

    // Select personal data collection
    await page.check('input[value="yes"][name="personalDataCollected"]')

    // Select data types
    await page.check('input[value="이름, 이메일, 전화번호"]')
    await page.check('input[value="주민등록번호"]')

    // Enter data subject count
    await page.fill('input[name="dataSubjectCount"]', '1000')

    // Select sensitive data processing
    await page.check('input[value="no"][name="sensitiveDataProcessing"]')

    // Select retention period
    await page.selectOption('select[name="dataRetentionPeriod"]', '3년')

    // Select foreign transfer
    await page.check('input[value="no"][name="foreignTransfer"]')

    // Select third party sharing
    await page.check('input[value="yes"][name="thirdPartySharing"]')

    // Select outsourcing
    await page.check('input[value="yes"][name="outsourcingProcessing"]')

    // Go to next step
    await page.click('button:has-text("다음")')

    // Step 3: External Outsourcing and Systems
    await expect(page.locator('h2').filter({ hasText: '외부 위탁 및 시스템' })).toBeVisible()

    // Select cloud services
    await page.check('input[value="yes"][name="cloudServices"]')

    // Select cloud providers
    await page.check('input[value="AWS"]')
    await page.check('input[value="Naver Cloud"]')

    // Enter security systems
    await page.fill('textarea[name="securitySystems"]', '방화벽, 침입탐지시스템')

    // Select incident response plan
    await page.check('input[value="yes"][name="incidentResponsePlan"]')

    // Submit onboarding
    await page.click('button:has-text("온보딩 완료")')

    // Wait for PIPA content pack to be applied
    await expect(page.locator('text=PIPA 컨텐츠팩 적용 중...')).toBeVisible()

    // Wait for completion message
    await expect(
      page.locator('text=온보딩이 완료되었습니다!'),
      { timeout: 10000 }
    ).toBeVisible()

    // Verify dashboard button is visible
    await expect(page.locator('button:has-text("대시보드로 이동")')).toBeVisible()
  })

  test('should show validation errors for required fields', async ({ page }) => {
    // Try to proceed without filling required fields
    await page.click('button:has-text("다음")')

    // Should show validation error (page should still be on step 1)
    await expect(page.locator('h2').filter({ hasText: '회사 기본 정보' })).toBeVisible()
  })

  test('should allow navigation back and forth between steps', async ({ page }) => {
    // Fill minimal required fields for step 1
    await page.fill('input[name="companyName"]', '주식회사 테스트')
    await page.selectOption('select[name="industry"]', '정보통신업')
    await page.selectOption('select[name="employeeCount"]', '10-49')
    await page.selectOption('select[name="annualRevenue"]', '10억-50억')
    await page.fill('input[name="dpoName"]', '홍길동')
    await page.fill('input[name="dpoEmail"]', 'dpo@test.com')
    await page.fill('input[name="dpoPhone"]', '010-1234-5678')

    // Go to step 2
    await page.click('button:has-text("다음")')
    await expect(page.locator('h2').filter({ hasText: '개인정보 처리 현황' })).toBeVisible()

    // Go back to step 1
    await page.click('button:has-text("이전")')
    await expect(page.locator('h2').filter({ hasText: '회사 기본 정보' })).toBeVisible()

    // Verify data is preserved
    await expect(page.locator('input[name="companyName"]')).toHaveValue('주식회사 테스트')
  })

  test('should show conditional questions based on previous answers', async ({ page }) => {
    // Fill step 1
    await page.fill('input[name="companyName"]', '주식회사 테스트')
    await page.selectOption('select[name="industry"]', '정보통신업')
    await page.selectOption('select[name="employeeCount"]', '10-49')
    await page.selectOption('select[name="annualRevenue"]', '10억-50억')
    await page.fill('input[name="dpoName"]', '홍길동')
    await page.fill('input[name="dpoEmail"]', 'dpo@test.com')
    await page.fill('input[name="dpoPhone"]', '010-1234-5678')
    await page.click('button:has-text("다음")')

    // In step 2, select "yes" for foreign transfer
    await page.check('input[value="yes"][name="foreignTransfer"]')

    // Should now show foreign transfer countries field
    await expect(page.locator('input[name="foreignTransferCountries"]')).toBeVisible()

    // Change to "no"
    await page.check('input[value="no"][name="foreignTransfer"]')

    // Foreign transfer countries field should be hidden
    await expect(page.locator('input[name="foreignTransferCountries"]')).not.toBeVisible()
  })
})
