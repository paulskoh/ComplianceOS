'use client'

export default function WorkflowsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Workflows & Exceptions</h2>
                    <p className="mt-1 text-sm text-gray-500">Process enforcement and audit trail for deviations.</p>
                </div>
                <button className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 shadow-sm">
                    Request Exception
                </button>
            </div>

            <div className="bg-white shadow-subtle rounded-lg border border-gray-200 p-12 text-center">
                <p className="text-gray-500">Workflow engine configuration and exception requests are managed here.</p>
                <p className="text-xs text-gray-400 mt-2">(Coming in next sprint)</p>
            </div>
        </div>
    )
}
