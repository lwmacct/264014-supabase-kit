import {
  DashboardOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import type { ReactNode } from "react";
import { AccountPage } from "../pages/account";
import { OverviewPage } from "../pages/overview";

export interface AppNavItem {
  key: string;
  label: string;
  icon: ReactNode;
  element: ReactNode;
}

export interface AppNavGroup {
  key: string;
  label: string;
  items: AppNavItem[];
}

export const appNavGroups: AppNavGroup[] = [
  {
    key: "overview",
    label: "Workspace",
    items: [
      {
        key: "/overview",
        label: "Dashboard",
        icon: <DashboardOutlined />,
        element: <OverviewPage />,
      },
    ],
  },
  {
    key: "account",
    label: "Account",
    items: [
      {
        key: "/account",
        label: "Profile",
        icon: <UserOutlined />,
        element: <AccountPage />,
      },
    ],
  },
];

export const appNavItems = appNavGroups.flatMap((group) => group.items);

export function buildAppMenuItems(): MenuProps["items"] {
  return appNavGroups
    .map((group) => {
      const items = group.items;
      if (items.length === 0) {
        return null;
      }

      return {
        key: group.key,
        type: "group" as const,
        label: group.label,
        children: items.map((item) => ({
          key: item.key,
          icon: item.icon,
          label: item.label,
        })),
      };
    })
    .filter(Boolean);
}

export function resolveCurrentNavItem(pathname: string) {
  return appNavItems.find((item) => item.key === pathname) ?? appNavItems[0];
}
