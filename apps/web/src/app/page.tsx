export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            ComplianceOS
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Inspection Readiness & Evidence System for Korean SMEs
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/login"
              className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              Login
            </a>
            <a
              href="/register"
              className="bg-white text-primary-600 border-2 border-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition"
            >
              Register
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-3 text-gray-900">
              Readiness Dashboard
            </h3>
            <p className="text-gray-600">
              Real-time compliance score and risk visibility across all domains
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-3 text-gray-900">
              Evidence Repository
            </h3>
            <p className="text-gray-600">
              Automated collection and classification of compliance evidence
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-3 text-gray-900">
              Inspection Packs
            </h3>
            <p className="text-gray-600">
              One-click generation of audit-ready packages with signed manifests
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
