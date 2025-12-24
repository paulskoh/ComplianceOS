type StatusPillProps = {
  status: string
  label: string
}

export default function StatusPill({ status, label }: StatusPillProps) {
  const colors = getStatusColors(status)

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      {label}
    </span>
  )
}

function getStatusColors(status: string): { bg: string; text: string } {
  const normalizedStatus = status.toUpperCase()

  // Evidence statuses
  if (normalizedStatus === 'MISSING') {
    return { bg: 'bg-gray-100', text: 'text-gray-800' }
  }
  if (normalizedStatus === 'UPLOADED') {
    return { bg: 'bg-blue-100', text: 'text-blue-800' }
  }
  if (normalizedStatus === 'VERIFIED') {
    return { bg: 'bg-green-100', text: 'text-green-800' }
  }
  if (normalizedStatus === 'FLAGGED') {
    return { bg: 'bg-red-100', text: 'text-red-800' }
  }
  if (normalizedStatus === 'EXPIRED') {
    return { bg: 'bg-yellow-100', text: 'text-yellow-800' }
  }

  // Severity levels
  if (normalizedStatus === 'HIGH') {
    return { bg: 'bg-red-100', text: 'text-red-800' }
  }
  if (normalizedStatus === 'MEDIUM') {
    return { bg: 'bg-yellow-100', text: 'text-yellow-800' }
  }
  if (normalizedStatus === 'LOW') {
    return { bg: 'bg-green-100', text: 'text-green-800' }
  }

  // Artifact statuses
  if (normalizedStatus === 'PENDING') {
    return { bg: 'bg-gray-100', text: 'text-gray-800' }
  }
  if (normalizedStatus === 'UPLOADING') {
    return { bg: 'bg-blue-100', text: 'text-blue-800' }
  }
  if (normalizedStatus === 'READY') {
    return { bg: 'bg-green-100', text: 'text-green-800' }
  }
  if (normalizedStatus === 'ANALYZING') {
    return { bg: 'bg-purple-100', text: 'text-purple-800' }
  }
  if (normalizedStatus === 'FAILED') {
    return { bg: 'bg-red-100', text: 'text-red-800' }
  }

  // Default
  return { bg: 'bg-gray-100', text: 'text-gray-800' }
}
