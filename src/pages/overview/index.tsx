import {
  AppstoreOutlined,
  DashboardOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import {
  Card,
  Col,
  Descriptions,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import { useSession } from "../../session/SessionProvider";
import "../shared/console-page.css";

export function OverviewPage() {
  const session = useSession();

  const statCards = [
    {
      label: "认证状态",
      value: session.user ? "已登录" : "未登录",
      detail: session.user ? "可以继续接入业务页面和数据查询" : "当前仅展示模板基础能力",
      icon: <DashboardOutlined />,
    },
    {
      label: "布局骨架",
      value: "Ready",
      detail: "侧边栏、移动端导航和主题切换已保留",
      icon: <AppstoreOutlined />,
    },
    {
      label: "认证能力",
      value: "Supabase",
      detail: "邮箱登录、注册和退出流程可直接复用",
      icon: <SafetyCertificateOutlined />,
    },
    {
      label: "下一步",
      value: "Build",
      detail: "从这里替换成你的 dashboard 或业务模块",
      icon: <RocketOutlined />,
    },
  ];

  return (
    <Space direction="vertical" size={16} className="full-width">
      <Card className="overview-hero">
        <div className="overview-hero-copy">
          <Space wrap size={[8, 8]}>
            <span className="overview-kicker">
              <DashboardOutlined />
              Dashboard
            </span>
            <Tag color="success">Template</Tag>
            <Tag color="processing">Starter</Tag>
          </Space>
          <Typography.Title level={4}>模板工作台</Typography.Title>
          <Typography.Paragraph>
            这里不再绑定成品业务数据，只保留一个可继续扩展的后台首页。你可以从认证、布局和基础信息卡片开始，逐步替换成自己的模块。
          </Typography.Paragraph>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {statCards.map((item) => (
          <Col key={item.label} xs={24} md={12} xl={6}>
            <Card className="gateway-stat-card" size="small">
              <Space size={12} align="start">
                <div className="gateway-stat-icon">{item.icon}</div>
                <div className="gateway-stat-copy">
                  <Typography.Text type="secondary">{item.label}</Typography.Text>
                  <Typography.Title level={3}>{item.value}</Typography.Title>
                  <Typography.Paragraph>{item.detail}</Typography.Paragraph>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card className="gateway-panel-card" size="small" title="当前会话">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="登录邮箱">{session.userEmail || "-"}</Descriptions.Item>
              <Descriptions.Item label="用户 ID">
                {session.user?.id || "当前未登录"}
              </Descriptions.Item>
              <Descriptions.Item label="模板状态">已移除成品业务页面</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card className="gateway-panel-card" size="small" title="建议保留">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Landing">公开首页和品牌入口</Descriptions.Item>
              <Descriptions.Item label="Auth">登录、注册、会话持久化</Descriptions.Item>
              <Descriptions.Item label="Layout">后台导航、响应式框架、主题切换</Descriptions.Item>
              <Descriptions.Item label="Profile">账户资料页，适合继续扩展</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card className="gateway-panel-card" size="small" title="后续改造建议">
        <Space direction="vertical" size={8}>
          <Typography.Text>
            1. 把 `Overview` 替换成你的核心业务 dashboard。
          </Typography.Text>
          <Typography.Text>
            2. 在当前路由结构下继续新增模块页，而不是把业务逻辑塞回模板层。
          </Typography.Text>
          <Typography.Text>
            3. 如果不需要用户资料页，可以继续删掉 `Profile` 和对应的 `profile services`。
          </Typography.Text>
          <Typography.Text>
            4. 如果未来不需要 Supabase，也可以只保留 UI 骨架，再替换认证实现。
          </Typography.Text>
        </Space>
      </Card>
    </Space>
  );
}
