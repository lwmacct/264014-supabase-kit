import {
  Avatar,
  Button,
  Menu,
  Popover,
} from "antd";
import {
  CloudOutlined,
  DeleteOutlined,
  DownOutlined,
  MenuOutlined,
  RightOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { useViewportBackground } from "../app/useViewportBackground";
import {
  buildAppMenuItems,
  resolveCurrentNavItem,
} from "../app/routes";
import { useMyProfileQuery } from "../services/profile/queries";
import { useSession } from "../session/SessionProvider";
import { ThemeToggle } from "./ThemeToggle";
import "./AppLayout.css";

export function AppLayout({ children }: { children: ReactNode }) {
  useViewportBackground({
    color: "var(--shell-bg)",
  });

  const session = useSession();
  const profileQuery = useMyProfileQuery(session.user?.id ?? null);
  const navigate = useNavigate();
  const location = useLocation();
  const buildVersion = import.meta.env.DEV
    ? "dev"
    : import.meta.env.VITE_APP_VERSION
      ? `v${import.meta.env.VITE_APP_VERSION}`
      : "build";
  const [navOpen, setNavOpen] = useState(false);
  const currentItem = resolveCurrentNavItem(location.pathname);
  const menuItems = buildAppMenuItems();
  const authenticated = Boolean(session.user);
  const authStatusLabel = session.userEmail || "未登录";
  const accountName =
    profileQuery.data?.display_name?.trim() || session.userEmail || "当前账户";
  const authTone = authenticated
    ? "success"
    : session.configured
      ? "warning"
      : "neutral";

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const accountPanel = (
    <div className="cf-auth-panel-menu">
      <button
        type="button"
        className="cf-auth-panel-summary"
        onClick={() => {
          navigate("/account");
          setNavOpen(false);
        }}
      >
        <span className="cf-auth-menu-meta">
          <strong>{accountName}</strong>
          <span>{authStatusLabel}</span>
        </span>
        <RightOutlined className="cf-auth-panel-arrow" />
      </button>

      <div className="cf-auth-panel-actions">
        <Button
          type="text"
          danger
          disabled={!session.user}
          className="cf-auth-panel-action is-danger"
          icon={<DeleteOutlined />}
          onClick={() => void session.signOut()}
        >
          退出登录
        </Button>
      </div>
    </div>
  );

  const sidebar = (
    <div className="cf-sidebar-shell">
      <button
        type="button"
        className="cf-brand"
        onClick={() => {
          navigate("/overview");
          setNavOpen(false);
        }}
      >
        <span className="cf-brand-mark">
          <CloudOutlined />
        </span>
        <span className="cf-brand-copy">
          <strong>Starter Kit</strong>
        </span>
      </button>

      <div className="cf-sidebar-nav">
        <Menu
          mode="inline"
          selectedKeys={[currentItem.key]}
          items={menuItems}
          onClick={({ key }) => {
            navigate(key);
            setNavOpen(false);
          }}
        />
      </div>

      <div className="cf-sidebar-footer">
        <Popover
          trigger="click"
          placement="top"
          overlayClassName="cf-auth-popover"
          getPopupContainer={(node) =>
            node?.closest(".app-theme-root") ?? document.body
          }
          content={accountPanel}
        >
          <Button
            className="cf-account-card"
            aria-label={`认证状态：${authStatusLabel}`}
          >
            <span className="cf-account-card-main">
              <Avatar
                size={36}
                className={`cf-auth-avatar is-${authTone}`}
                icon={!session.userEmail ? <UserOutlined /> : undefined}
              >
                {session.userEmail.slice(0, 1).toUpperCase()}
              </Avatar>
              <span className="cf-account-card-copy">
                <strong>{accountName}</strong>
                <span>{authStatusLabel}</span>
              </span>
            </span>
            <DownOutlined className="cf-auth-trigger-arrow" />
          </Button>
        </Popover>

        <div className="cf-sidebar-utility">
          <span className="cf-build-badge">{buildVersion}</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-layout cf-shell" data-nav-open={navOpen}>
      <button
        type="button"
        className="cf-shell-mask"
        aria-label="关闭导航"
        onClick={() => setNavOpen(false)}
      />
      <aside className="cf-sidebar" aria-label="主导航">
        {sidebar}
      </aside>
      <div className="cf-main">
        <header className="cf-mobilebar">
          <Button
            type="text"
            className="cf-mobilebar-menu"
            icon={<MenuOutlined />}
            aria-label="打开导航"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          />
          <div className="cf-mobilebar-title">{currentItem.label}</div>
          <Popover
            trigger="click"
            placement="bottomRight"
            overlayClassName="cf-auth-popover"
            getPopupContainer={(node) =>
              node?.closest(".app-theme-root") ?? document.body
            }
            content={accountPanel}
          >
            <Button
              className="cf-mobilebar-account"
              aria-label={`认证状态：${authStatusLabel}`}
            >
              <Avatar
                size={28}
                className={`cf-auth-avatar is-${authTone}`}
                icon={!session.userEmail ? <UserOutlined /> : undefined}
              >
                {session.userEmail.slice(0, 1).toUpperCase()}
              </Avatar>
            </Button>
          </Popover>
        </header>
        <main className="cf-content">{children}</main>
      </div>
    </div>
  );
}
