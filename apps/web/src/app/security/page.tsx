'use client'

import {
  ShieldCheckIcon,
  LockClosedIcon,
  ServerIcon,
  KeyIcon,
  DocumentCheckIcon,
  EyeSlashIcon,
  ClockIcon,
  GlobeAltIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline'

export default function SecurityTrustPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <ShieldCheckIcon className="h-20 w-20 mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">보안 및 신뢰성</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              ComplianceOS는 귀사의 민감한 컴플라이언스 데이터를 최고 수준의
              보안으로 보호합니다
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Certifications */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            인증 및 준수
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <CheckBadgeIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ISMS-P 인증
              </h3>
              <p className="text-sm text-gray-600">
                정보보호 및 개인정보보호 관리체계 인증
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <CheckBadgeIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ISO 27001
              </h3>
              <p className="text-sm text-gray-600">
                국제 정보보안 관리체계 표준 준수
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <CheckBadgeIcon className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                PIPA 준수
              </h3>
              <p className="text-sm text-gray-600">
                개인정보 보호법 완전 준수
              </p>
            </div>
          </div>
        </section>

        {/* Security Features */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            보안 기능
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Encryption */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <LockClosedIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    엔드투엔드 암호화
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    모든 데이터는 전송 중(TLS 1.3) 및 저장 시(AES-256)
                    암호화됩니다
                  </p>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                      AWS KMS를 통한 키 관리
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                      FIPS 140-2 인증 암호화 모듈
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                      자동 키 교체
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Access Control */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <KeyIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    접근 제어
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    역할 기반 접근 제어(RBAC)로 데이터 접근을 엄격히 관리합니다
                  </p>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                      다단계 인증 (MFA) 지원
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                      최소 권한 원칙 적용
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                      세션 타임아웃 자동 설정
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Infrastructure */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <ServerIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    안전한 인프라
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    AWS 서울 리전에서 운영되는 엔터프라이즈급 인프라
                  </p>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                      VPC 격리 및 프라이빗 서브넷
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                      DDoS 방어 (AWS Shield)
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                      정기적인 보안 패치 및 업데이트
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Audit Logging */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <DocumentCheckIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    감사 추적
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    모든 중요 작업에 대한 완전한 감사 로그 기록
                  </p>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                      변조 방지 로그 저장
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                      실시간 이상 탐지
                    </li>
                    <li className="flex items-center">
                      <CheckBadgeIcon className="h-4 w-4 text-green-500 mr-2" />
                      7년 로그 보관
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Data Privacy */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-8">
            <div className="flex items-start space-x-4">
              <EyeSlashIcon className="h-10 w-10 text-purple-600 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  데이터 프라이버시 보장
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      테넌트 격리
                    </h4>
                    <p className="text-sm text-gray-600">
                      귀사의 데이터는 완전히 격리되어 다른 고객과 절대 공유되지
                      않습니다
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      데이터 주권
                    </h4>
                    <p className="text-sm text-gray-600">
                      모든 데이터는 대한민국 내 서울 리전에만 저장되며, 국외로
                      이전되지 않습니다
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      데이터 소유권
                    </h4>
                    <p className="text-sm text-gray-600">
                      모든 데이터는 고객의 소유이며, 언제든지 내보내거나 삭제할
                      수 있습니다
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      개인정보 최소 수집
                    </h4>
                    <p className="text-sm text-gray-600">
                      서비스 제공에 필수적인 최소한의 정보만 수집합니다
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Backup & Recovery */}
        <section className="mb-16">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex items-start space-x-4">
              <ClockIcon className="h-10 w-10 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  백업 및 복구
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      자동 백업
                    </h4>
                    <p className="text-sm text-gray-600">
                      매일 자동으로 전체 데이터 백업이 수행됩니다
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      지역 복제
                    </h4>
                    <p className="text-sm text-gray-600">
                      서울 리전 내 다중 가용영역에 데이터가 복제됩니다
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      신속한 복구
                    </h4>
                    <p className="text-sm text-gray-600">
                      재해 발생 시 4시간 이내 서비스 복구 (RTO)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Compliance Commitments */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            컴플라이언스 약속
          </h2>
          <div className="bg-blue-50 rounded-lg p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <GlobeAltIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    개인정보 보호법 (PIPA) 준수
                  </h4>
                  <p className="text-sm text-gray-600">
                    개인정보 처리방침 공개, 동의 관리, 정보주체 권리 보장
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <GlobeAltIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    정보통신망법 준수
                  </h4>
                  <p className="text-sm text-gray-600">
                    본인확인 절차, 개인정보 유효기간 설정, 파기 절차 이행
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <GlobeAltIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    클라우드 보안 인증 (CSAP)
                  </h4>
                  <p className="text-sm text-gray-600">
                    클라우드 서비스 보안 인증 획득 추진 중
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <GlobeAltIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    정기 보안 감사
                  </h4>
                  <p className="text-sm text-gray-600">
                    외부 전문기관을 통한 연 2회 보안 감사 실시
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            보안 관련 문의
          </h2>
          <p className="text-gray-600 mb-6">
            보안 취약점을 발견하셨거나 보안 관련 문의사항이 있으시면
            언제든지 연락주세요
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="text-sm">
              <span className="font-medium text-gray-900">이메일:</span>{' '}
              <a
                href="mailto:security@complianceos.kr"
                className="text-blue-600 hover:underline"
              >
                security@complianceos.kr
              </a>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-900">보안 제보:</span>{' '}
              <a
                href="mailto:bugbounty@complianceos.kr"
                className="text-blue-600 hover:underline"
              >
                bugbounty@complianceos.kr
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
