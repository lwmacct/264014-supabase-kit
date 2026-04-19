import {
  ArrowRightOutlined,
  CloudServerOutlined,
  KeyOutlined,
  LineChartOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Space, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { PublicLayout } from "../../components/PublicLayout";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useSession } from "../../session/SessionProvider";
import "./index.css";

const leftNodes = ["IDE Agent", "CLI Agent", "Workflow Agent"];
const rightNodes = ["React", "Supabase", "Ant Design"];

const capabilityCards = [
  {
    title: "认证基础",
    description: "开箱即用的登录注册和会话管理。",
    icon: <CloudServerOutlined />,
  },
  {
    title: "后台骨架",
    description: "保留导航、主题和基础页面结构。",
    icon: <KeyOutlined />,
  },
  {
    title: "易于二开",
    description: "去掉成品业务后，更适合作为项目起点。",
    icon: <LineChartOutlined />,
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const session = useSession();

  return (
    <PublicLayout>
      <div className="home-shell">
        <header className="home-topbar">
          <div className="home-brand">
            <span className="home-brand-mark">
              <SafetyCertificateOutlined />
            </span>
            <span className="home-brand-copy">
              <strong>Starter Kit</strong>
              <span>Template</span>
            </span>
          </div>

          <Space size={12}>
            <Button type="text" onClick={() => navigate("/auth?mode=sign-in")}>
              登录
            </Button>
            <Button
              type="primary"
              onClick={() => navigate("/auth?mode=sign-up")}
            >
              注册
            </Button>
            <ThemeToggle />
          </Space>
        </header>

        <section className="home-stage">
          <div className="home-stage-copy">
            <div className="home-badge">
              <ThunderboltOutlined />
              <span>React + Supabase Template</span>
            </div>

            <Typography.Title className="home-title">
              精简后的
              <br />
              项目模板骨架
            </Typography.Title>

            <Typography.Paragraph className="home-subtitle">
              保留认证、主题和控制台布局，方便继续扩展自己的业务。
            </Typography.Paragraph>

            <Space wrap size={[12, 12]} className="home-hero-actions">
              <Button
                type="primary"
                size="large"
                icon={<ArrowRightOutlined />}
                onClick={() => navigate("/auth?mode=sign-up")}
              >
                开始使用
              </Button>
              <Button
                size="large"
                onClick={() => navigate("/auth?mode=sign-in")}
              >
                进入控制台
              </Button>
            </Space>

            {!session.configured ? (
              <Alert
                type="warning"
                showIcon
                className="home-config-alert"
                message="认证尚未配置完成"
                description="当前站点缺少前端认证环境变量，登录入口会被禁用，需先补齐配置。"
              />
            ) : null}
          </div>

          <Card className="home-stage-visual" variant="borderless">
            <div className="home-visual-grid">
              <div className="home-visual-column">
                <span className="home-visual-label">入口</span>
                <div className="home-visual-stack">
                  {leftNodes.map((item) => (
                    <div key={item} className="home-visual-node">
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="home-visual-core">
                <span className="home-core-ring" aria-hidden="true" />
                <div className="home-core-mark">
                  <KeyOutlined />
                </div>
                <Typography.Text strong>Starter Kit</Typography.Text>
                <Typography.Paragraph>基础项目骨架</Typography.Paragraph>
              </div>

              <div className="home-visual-column">
                <span className="home-visual-label">厂商</span>
                <div className="home-visual-stack">
                  {rightNodes.map((item) => (
                    <div key={item} className="home-visual-node is-model">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className="home-features">
          {capabilityCards.map((item) => (
            <Card
              key={item.title}
              className="home-feature-card"
              variant="borderless"
            >
              <div className="home-feature-icon">{item.icon}</div>
              <Typography.Title level={4} className="home-feature-title">
                {item.title}
              </Typography.Title>
              <Typography.Paragraph className="home-feature-text">
                {item.description}
              </Typography.Paragraph>
            </Card>
          ))}
        </section>
      </div>
    </PublicLayout>
  );
}
