import { getCurrentUser } from "@/lib/auth";
import AppSidebarClient from "./AppSidebarClient";

interface Props {
  title: string;
  children?: React.ReactNode;
  fullHeight?: boolean;
}

export default async function AppNav({ title, children, fullHeight = false }: Props) {
  const me = await getCurrentUser();

  if (fullHeight) {
    return (
      <div className="h-screen flex overflow-hidden bg-parchment">
        <AppSidebarClient
          role={me?.role ?? ""}
          userName={me?.name ?? me?.email ?? ""}
          userId={me?.id ?? ""}
          title={title}
        />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden pt-14 lg:pt-0">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-parchment">
      <AppSidebarClient
        role={me?.role ?? ""}
        userName={me?.name ?? me?.email ?? ""}
        userId={me?.id ?? ""}
        title={title}
      />
      <div className="flex-1 pt-14 lg:pt-0">
        {children}
      </div>
    </div>
  );
}
