export function LegalAssistantShell({ authToken }: { authToken: string }) {
  return (
    <HomeProvider authToken={authToken}>
      <CommandK />
      <LegalAssistantChat />
    </HomeProvider>
  );
}
