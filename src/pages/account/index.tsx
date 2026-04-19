import {
  CheckCircleOutlined,
  ReloadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  App as AntdApp,
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import { useEffect } from "react";
import { useUpdateMyProfileMutation } from "../../services/profile/mutations";
import { useMyProfileQuery } from "../../services/profile/queries";
import { useSession } from "../../session/SessionProvider";
import "../shared/console-page.css";
import "./index.css";

interface AccountFormValues {
  display_name: string;
}

const accountDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatAccountTimestamp(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return accountDateFormatter.format(date);
}

export function AccountPage() {
  const session = useSession();
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<AccountFormValues>();
  const profileQuery = useMyProfileQuery(session.user?.id ?? null);
  const saveProfile = useUpdateMyProfileMutation(
    session.user?.id ?? null,
    session.user?.email ?? null,
  );
  const profile = profileQuery.data ?? null;

  useEffect(() => {
    form.setFieldsValue({
      display_name: profile?.display_name ?? "",
    });
  }, [form, profile]);

  async function submit(values: AccountFormValues) {
    try {
      await saveProfile.mutateAsync({
        display_name: values.display_name.trim() || null,
      });
      message.success("资料已保存。");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "保存失败。");
    }
  }

  const displayName = profile?.display_name?.trim() || "未设置";
  const avatarInitial = (profile?.display_name?.trim() || session.userEmail || "U")
    .slice(0, 1)
    .toUpperCase();
  const profileErrorMessage =
    profileQuery.error instanceof Error ? profileQuery.error.message : "";

  return (
    <Space direction="vertical" size={16} className="full-width">
      <Card className="overview-hero account-hero">
        <Space direction="vertical" size={10} className="full-width">
          <Space wrap size={[8, 8]}>
            <Tag color="processing" icon={<UserOutlined />}>
              Profile
            </Tag>
            <Tag
              color={
                profile
                  ? "success"
                  : profileQuery.isError
                    ? "error"
                    : "warning"
              }
            >
              {profile
                ? "已加载资料"
                : profileQuery.isError
                  ? "加载失败"
                  : "可创建资料"}
            </Tag>
          </Space>

          <Typography.Title level={4}>账户资料设置</Typography.Title>
          <Typography.Paragraph>
            保留模板最常用的一条资料链路：读取当前用户信息、编辑显示名并保存到 `profiles`。
          </Typography.Paragraph>
        </Space>
      </Card>

      {profileErrorMessage ? (
        <Alert
          type="warning"
          showIcon
          message="账户信息读取失败"
          description={profileErrorMessage}
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card
            className="account-summary-card"
            title="当前账户"
            extra={
              <Button
                className="account-refresh-button"
                icon={<ReloadOutlined />}
                loading={profileQuery.isFetching}
                onClick={() => void profileQuery.refetch()}
              >
                刷新
              </Button>
            }
          >
            <Space direction="vertical" size={20} className="full-width">
              <Space size={16} align="center" wrap className="account-profile-head">
                <Avatar size={72} className="profile-avatar">
                  {avatarInitial}
                </Avatar>
                <div className="account-profile-meta">
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {displayName}
                  </Typography.Title>
                  <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                    {profile?.email || session.userEmail}
                  </Typography.Paragraph>
                </div>
              </Space>

              <Descriptions column={1} size="small">
                <Descriptions.Item label="登录邮箱">
                  {profile?.email || session.userEmail}
                </Descriptions.Item>
                <Descriptions.Item label="用户 ID">
                  {session.user?.id || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="注册时间">
                  {formatAccountTimestamp(profile?.created_at)}
                </Descriptions.Item>
                <Descriptions.Item label="最近更新">
                  {formatAccountTimestamp(profile?.updated_at)}
                </Descriptions.Item>
              </Descriptions>
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card className="account-form-card" title="基础资料">
            <Form
              className="account-form"
              form={form}
              layout="vertical"
              onFinish={submit}
              initialValues={{
                display_name: "",
              }}
            >
              <Form.Item label="邮箱">
                <Input
                  size="large"
                  value={profile?.email || session.userEmail}
                  disabled
                />
              </Form.Item>

              <Form.Item
                label="显示名"
                name="display_name"
                rules={[
                  {
                    max: 48,
                    message: "显示名不要超过 48 个字符。",
                  },
                ]}
              >
                <Input
                  size="large"
                  prefix={<UserOutlined />}
                  placeholder="例如：Acme Team"
                />
              </Form.Item>

              <Typography.Paragraph type="secondary" className="account-form-note">
                这是模板里保留的最小可复用资料字段。后续如果需要昵称、手机号、组织信息，再继续扩展即可。
              </Typography.Paragraph>

              <Space wrap className="account-form-actions">
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<CheckCircleOutlined />}
                  loading={saveProfile.isPending}
                >
                  保存
                </Button>
                <Button
                  onClick={() =>
                    form.setFieldsValue({
                      display_name: profile?.display_name ?? "",
                    })
                  }
                >
                  重置
                </Button>
              </Space>
            </Form>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
