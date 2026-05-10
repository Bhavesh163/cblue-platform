import ClientChatPage from "./ClientChatPage";

export default async function ChatPage({ params }: { params: Promise<{ locale: string, id: string }> }) {
  const resolvedParams = await params;
  return <ClientChatPage orderId={resolvedParams.id} locale={resolvedParams.locale} />;
}
