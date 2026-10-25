import { auth } from "@clerk/nextjs/server"

export default async function ChatPage({
  params,
}: {
  params: Promise<{ chatid: string }>
}) {
  await auth.protect()
  const { chatid } = await params

  return <p>{chatid}</p>
}
