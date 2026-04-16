import { redirect } from 'next/navigation'

export default async function JoinPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  redirect(`/request/${eventId}`)
}
