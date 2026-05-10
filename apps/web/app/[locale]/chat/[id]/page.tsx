import ClientChatPage from "./ClientChatPage";

export default function ChatPage({ params }: { params: { locale: string, id: string } }) {
  return <ClientChatPage orderId={params.id} locale={params.locale} />;
}
