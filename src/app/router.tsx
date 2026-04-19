import { Alert, Button, Layout, Spin, Typography } from "antd";
import {
  createHashRouter,
  isRouteErrorResponse,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigate,
  useRouteError,
} from "react-router-dom";
import { appNavItems } from "./routes";
import { AppLayout } from "../components/AppLayout";
import { AuthPage } from "../pages/auth";
import { HomePage } from "../pages/home";
import { useSession } from "../session/SessionProvider";

function RootShell() {
  return <Outlet />;
}

function FullScreenLoading() {
  return (
    <Layout
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
      }}
    >
      <Spin size="large" />
    </Layout>
  );
}

function PublicIndexRoute() {
  const session = useSession();

  if (session.initializing) {
    return <FullScreenLoading />;
  }

  if (session.user) {
    return <Navigate to="/overview" replace />;
  }

  return <HomePage />;
}

function ProtectedLayout() {
  const session = useSession();
  const location = useLocation();

  if (session.initializing) {
    return <FullScreenLoading />;
  }

  if (!session.user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?from=${encodeURIComponent(next)}`} replace />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function FallbackRoute() {
  const session = useSession();

  if (session.initializing) {
    return <FullScreenLoading />;
  }

  return <Navigate to={session.user ? "/overview" : "/"} replace />;
}

function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let description = "页面加载失败";
  if (isRouteErrorResponse(error)) {
    description = `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    description = error.message;
  }

  return (
    <Layout
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
      }}
    >
      <Alert
        type="error"
        showIcon
        message="路由加载失败"
        description={
          <div>
            <Typography.Text>{description}</Typography.Text>
            <div style={{ marginTop: 12 }}>
              <Button type="primary" onClick={() => navigate(0)}>
                重试
              </Button>
            </div>
          </div>
        }
      />
    </Layout>
  );
}

const router = createHashRouter([
  {
    path: "/",
    element: <RootShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <PublicIndexRoute />,
      },
      {
        path: "/auth",
        element: <AuthPage />,
      },
      {
        element: <ProtectedLayout />,
        children: [
          ...appNavItems.map((item) => ({
            path: item.key,
            element: item.element,
          })),
        ],
      },
      {
        path: "*",
        element: <FallbackRoute />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
