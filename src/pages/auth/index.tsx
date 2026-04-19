import {
  ArrowLeftOutlined,
  LockOutlined,
  LoginOutlined,
  LogoutOutlined,
  MailOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import {
  App as AntdApp,
  Alert,
  Button,
  Card,
  Form,
  Input,
  Segmented,
  Space,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { PublicLayout } from "../../components/PublicLayout";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useSession } from "../../session/SessionProvider";
import "./index.css";

interface AuthFormValues {
  email: string;
  password: string;
  confirmPassword?: string;
}

export function AuthPage() {
  const session = useSession();
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form] = Form.useForm<AuthFormValues>();
  const modeParam = searchParams.get("mode");
  const [mode, setMode] = useState<"sign-in" | "sign-up">(() => {
    return modeParam === "sign-up" ? "sign-up" : "sign-in";
  });
  const [submitting, setSubmitting] = useState(false);

  const nextPath =
    searchParams.get("from") ??
    (typeof (location.state as { from?: string } | null)?.from === "string"
      ? (location.state as { from?: string }).from!
      : "/overview");

  useEffect(() => {
    if (!session.userEmail) {
      return;
    }

    form.setFieldValue("email", session.userEmail);
  }, [form, session.userEmail]);

  useEffect(() => {
    const nextMode = modeParam === "sign-up" ? "sign-up" : "sign-in";
    setMode(nextMode);
  }, [modeParam]);

  useEffect(() => {
    if (!session.user) {
      return;
    }

    navigate(nextPath, { replace: true });
  }, [navigate, nextPath, session.user]);

  async function submit(values: AuthFormValues) {
    setSubmitting(true);

    try {
      if (mode === "sign-up") {
        if (values.password !== values.confirmPassword) {
          throw new Error("两次输入的密码不一致。");
        }

        const result = await session.signUp(values.email, values.password);
        if (result.emailConfirmationRequired) {
          message.success("注册成功，请查收确认邮件后再登录。");
          form.setFieldsValue({
            password: "",
            confirmPassword: "",
          });
          return;
        }

        message.success("注册成功，已自动登录。");
      } else {
        await session.signIn(values.email, values.password);
        message.success("登录成功。");
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "认证失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicLayout centered>
      <div className="auth-shell">
        <Card className="auth-card" variant="borderless">
          <Space direction="vertical" size={20} className="full-width">
            <div className="auth-topline">
              <Button
                type="text"
                className="auth-back-button"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/")}
              >
                返回首页
              </Button>
              <ThemeToggle />
            </div>

            <div className="auth-card-header">
              <div className="auth-card-icon">
                <LockOutlined />
              </div>
              <div>
                <Typography.Title level={3} className="auth-card-title">
                  欢迎回来
                </Typography.Title>
                <Typography.Paragraph className="auth-card-copy">
                  输入邮箱和密码即可登录账户，或创建一个新账户开始使用。
                </Typography.Paragraph>
              </div>
            </div>

            {!session.configured ? (
              <Alert
                type="warning"
                showIcon
                message="缺少认证配置"
                description="请先补齐前端环境变量，然后重启前端服务。"
              />
            ) : null}

            {session.errorMessage ? (
              <Alert
                type="warning"
                showIcon
                message="认证提示"
                description={session.errorMessage}
              />
            ) : null}

            <Form
              form={form}
              name="auth-form"
              layout="vertical"
              autoComplete="on"
              method="post"
              onFinish={submit}
              initialValues={{ email: session.userEmail }}
            >
              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: true, message: "请输入邮箱。" },
                  { type: "email", message: "请输入有效邮箱地址。" },
                ]}
              >
                <Input
                  size="large"
                  prefix={<MailOutlined />}
                  placeholder="you@example.com"
                  autoComplete="email"
                  spellCheck={false}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: "请输入密码。" },
                  { min: 6, message: "密码至少 6 位。" },
                ]}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined />}
                  placeholder="输入密码"
                  autoComplete={
                    mode === "sign-up" ? "new-password" : "current-password"
                  }
                  spellCheck={false}
                />
              </Form.Item>

              {mode === "sign-up" ? (
                <Form.Item
                  name="confirmPassword"
                  label="确认密码"
                  rules={[
                    { required: true, message: "请再次输入密码。" },
                    {
                      validator: async (_, value) => {
                        if (!value || value === form.getFieldValue("password")) {
                          return;
                        }

                        throw new Error("两次输入的密码不一致。");
                      },
                    },
                  ]}
                >
                  <Input.Password
                    size="large"
                    prefix={<LockOutlined />}
                    placeholder="再次输入密码"
                    autoComplete="new-password"
                    spellCheck={false}
                  />
                </Form.Item>
              ) : null}

              <Space direction="vertical" size={12} className="full-width">
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  className="auth-submit-button"
                  loading={submitting || session.initializing}
                  disabled={!session.configured}
                  icon={mode === "sign-up" ? <UserAddOutlined /> : <LoginOutlined />}
                  block
                >
                  {mode === "sign-up" ? "注册账户" : "登录并进入"}
                </Button>

                <Space size={12} wrap className="full-width">
                  {session.user ? (
                    <Button type="default" onClick={() => navigate(nextPath)}>
                      直接进入
                    </Button>
                  ) : null}
                  {session.user ? (
                    <Button
                      icon={<LogoutOutlined />}
                      onClick={() => void session.signOut()}
                    >
                      退出登录
                    </Button>
                  ) : null}
                </Space>

                <Space direction="vertical" size={8} className="full-width">
                  <Typography.Text type="secondary">
                    {mode === "sign-up"
                      ? "已经有账户了？切换到登录"
                      : "还没有账户？切换到注册"}
                  </Typography.Text>
                  <Segmented
                    block
                    value={mode}
                    options={[
                      {
                        label: "登录",
                        value: "sign-in",
                        icon: <LoginOutlined />,
                      },
                      {
                        label: "注册",
                        value: "sign-up",
                        icon: <UserAddOutlined />,
                      },
                    ]}
                    onChange={(value) => {
                      const nextMode = value as "sign-in" | "sign-up";
                      const nextParams = new URLSearchParams(searchParams);

                      nextParams.set("mode", nextMode);
                      setSearchParams(nextParams, { replace: true });
                      session.clearError();
                      setMode(nextMode);
                      form.setFieldsValue({
                        password: "",
                        confirmPassword: "",
                      });
                    }}
                  />
                </Space>
              </Space>
            </Form>
          </Space>
        </Card>
      </div>
    </PublicLayout>
  );
}
