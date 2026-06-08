import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  User,
  Calculator,
  Package,
  Gift,
  ShoppingBag,
  ClipboardList,
  BarChart3,
  Brain,
  TrendingUp,
  Settings,
  Gem,
  Sparkles,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Início", url: "/", icon: LayoutDashboard },
  { title: "Perfil do Ateliê", url: "/perfil", icon: User },
  { title: "Precificação e Custos", url: "/precificacao", icon: Calculator },
  { title: "Materiais", url: "/materiais", icon: Package },
  { title: "Produtos", url: "/produtos", icon: Gift },
  { title: "Catálogo", url: "/catalogo", icon: ShoppingBag },
  { title: "Pedidos", url: "/pedidos", icon: ClipboardList },
];

const diamondItems = [
  { title: "Faturamento", url: "/faturamento", icon: BarChart3 },
  { title: "Inteligência Financeira", url: "/inteligencia", icon: Brain },
  { title: "Dashboard Executivo", url: "/executivo", icon: TrendingUp },
];

const bottomItems = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 py-5">
        <Link to="/" className="flex items-center gap-2.5 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="font-display text-base font-semibold">Lucrando</p>
              <p className="font-display text-base font-semibold -mt-1">com Papel</p>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Gestão</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="rounded-full data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="flex items-center gap-1.5">
              <Gem className="h-3 w-3 text-diamond" /> Plano Diamante
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {diamondItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="rounded-full data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      <Gem className="h-3 w-3 text-diamond" />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="rounded-full"
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
