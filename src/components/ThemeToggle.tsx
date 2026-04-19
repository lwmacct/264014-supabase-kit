import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useThemeMode } from "../theme/theme";

export function ThemeToggle() {
  const { isDark, setMode } = useThemeMode();
  const toggleTitle = isDark ? "切换到浅色主题" : "切换到深色主题";

  return (
    <Tooltip title={toggleTitle}>
      <Button
        type="text"
        className={`theme-toggle-button is-${isDark ? "dark" : "light"}`}
        aria-label={toggleTitle}
        icon={isDark ? <MoonOutlined /> : <SunOutlined />}
        onClick={() => setMode(isDark ? "light" : "dark")}
      />
    </Tooltip>
  );
}
